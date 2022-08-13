'use strict';

const fetch = require("node-fetch");
const moment = require('moment')
const nodemailer = require('nodemailer');
const createError = require('http-errors');
const BaseService = require('./base.service')
const ShipFeeService = require('./shipFee.service').getInstance()
const ProductService = require('./product.service').getInstance()
const ShoppingCartService = require('./shoppingCart.service').getInstance()
const SendMailService = require('./sendMail.service').getInstance()
const Product = require('../models/product.model.js')
const Order = require('../models/order.model.js')
const OrderDetail = require('../models/orderDetail.model.js')

moment.lang('en', {
  week: {
      dow: 1 // Monday is the first day of the week.
  }
});

module.exports = class OrderService extends BaseService {
  constructor(){
    super()
  }
  async create(OrderInfo) {
    try {
      //Begin == Create order//
      const {token, shopId, full_address, note, first_name, last_name, phone, address, to_district_id, to_ward_code, item, email, id_customer} = OrderInfo //id_customer đăng nhập thì truyền
      const to_district_id_param = parseInt(to_district_id)
      const to_ward_code_param = to_ward_code
      const shipFee = (await ShipFeeService.getShipFee(to_district_id_param, to_ward_code_param))?.data?.total
      let products;
      let is_not_enough;
      let total_fee = shipFee;
      let id_customer_main = id_customer;
      if(item!=null)
      {
        products = item
        
        for(let i = 0; i < products.length; i++)
        {
          is_not_enough = await Product.findOne({_id:products[i].id, unitsinstock: {$lt:products[i].quantity}})
          if (is_not_enough)
          {
            return {is_completed: false, msg:"Không đủ số lượng sản phẩm"}
          }
          const productInfo = await ProductService.getById(products[i].id)
          products[i]['name'] = productInfo.name
          products[i]['weight'] = 200
          products[i]['price'] = productInfo.price
          productInfo['quantity'] = products[i].quantity
          total_fee += productInfo?.price * products[i].quantity
        }
      }

      if(id_customer == null)
      {
          id_customer_main = "";
      }

      let createOrder = await fetch("https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create",{
        method:'post',
        headers: { 
            'Content-Type': 'application/json',
            'Token':token,
            'ShopId':shopId
        },
        body: JSON.stringify({
            "payment_type_id": 2,
            "note": note,
            "required_note": "KHONGCHOXEMHANG",
            "to_name": `${first_name} ${last_name}` ,
            "to_phone": phone,
            "to_address": address,
            "to_ward_code":to_ward_code ,
            "to_district_id": parseInt(to_district_id),
            "content": "Theo Viet Nam Times",
            "weight": 200,
            "length": 1,
            "width": 19,
            "height": 10,
            "service_id": 0,
            "service_type_id":2,
            "payment_type_id":2,
            "items": products
        }), 
      })

      createOrder = await createOrder.json()

      if (createOrder.code == 400) {
        return {is_completed: false, msg:createOrder.code_message_value}
      }
      else if (createOrder.code == 200) {
        //Begin==Create Order//
        const orderInfo = await Order.create({
          order_code: createOrder.data.order_code,
          full_address: full_address,
          customer_id: id_customer_main,
          note:note,
          first_name: first_name,
          last_name: last_name,
          phone: phone,
          address: address,
          email: email,
          employee_id: "",
          order_date: moment().utcOffset(420).format('DD/MM/YYYY HH:mm'),
          ship_date: moment(createOrder.data.expected_delivery_time).utcOffset(420).format('DD/MM/YYYY'),
          ship_fee: shipFee,
          product_fee: total_fee - shipFee,
          total_fee: total_fee,
          payed: false,
          status: 0,
          district_id: to_district_id,
          ward_code: to_ward_code
        })

        //End==Create Order//

        const order_id = orderInfo._id.toString()
        //Begin==Create OrderDetail//
        products.forEach(async product => {
          await OrderDetail.create({
            order_id: order_id,
            product_id: product.id,
            quantity:product.quantity,
            name: product.name,
            price: product.price,
            imageList: product.imageList
          })
        });
        if (id_customer_main) {
          const shoppingCartID = ( await ShoppingCartService.getShoppingCartByCusId(id_customer_main))?._id.toString()
          if (shoppingCartID) {
            ShoppingCartService.deleteShoppingCartByUserId({cus_id: id_customer_main})
            ShoppingCartService.deleteShoppingCartDetailBySCId({shoppingCart_id: shoppingCartID})
          }
        }
        /////===Begin====Gửi email thông báo thành công=======///////
        const text = 'Bạn vừa đặt mua sản phẩm tại cửa hàng Flower Sun \nMã đơn hàng: ' + json.data.order_code + 
        '\nPhí vận chuyển: ' + formatAmount(parseInt(shipFee)) + "\nTổng tiền: " + formatAmount(parseInt(total_fee ))
        const to = email

        await SendMailService.send({to, text})
        /////===End====Gửi email thông báo thành công=======///////
        
        //End == Create order //
      } else {
        throw new Error({is_completed: false, msg: "Giao dịch thất bại"})
      }
      return {is_completed: true, msg: "Giao dịch thành công"}
    }
    catch (err) {
      console.log(err.message)
      throw Error(err)
    }
  }

  async getTotal({option = 'day', selectedDate = moment()}) {
    const dateParams = moment(selectedDate, 'DD/MM/YYYY')
    const total_order = await Order.find({status:2})
    const from_date = moment(dateParams).startOf('week')
    const to_date = moment(dateParams).endOf('week');
    let result;
    switch(option) {
      case 'day':
        result = total_order.filter((element) => {
          return dateParams.isSame(moment(element.receive_date, 'DD/MM/YYYY'), 'day')
          && dateParams.isSame(moment(element.receive_date, 'DD/MM/YYYY'), 'month')
          && dateParams.isSame(moment(element.receive_date, 'DD/MM/YYYY'), 'year')
        })
        break;
      case 'week':
        result = total_order.filter((element) => {
          return moment(element.receive_date, 'DD/MM/YYYY').isBetween(from_date, to_date)
        })
        break;
      case 'month':
        result = total_order.filter((element) => {
          return dateParams.isSame(moment(element.receive_date, 'DD/MM/YYYY'), 'month')
          && dateParams.isSame(moment(element.receive_date, 'DD/MM/YYYY'), 'year')
        })
        break;
      case 'year':
        result = total_order.filter((element) => {
          return  dateParams.isSame(moment(element.receive_date, 'DD/MM/YYYY'), 'year')
        })
        break;
      default:
        break;
    }
    const total = result.reduce((sum, row)=>{
      return sum + row.total_fee
    }, 0)
    return {result, total}
  }
  async getById(id) {
    const orderInfo = await Order.findById(id)
    const orderDetailInfo = await OrderDetail.find({order_id: id})
    return {orderInfo, orderDetailInfo}
  }
  async list ({page, size, sort, direction, cus_id, status, order_code, is_paging = true}) {
    const pageParam = page ? page : 1
    const sizeParam = size ? size : 9
    let filters = {}
    let sorts = {}
    const is_pagingParam = JSON.parse(is_paging)


    if (sort && direction) {
      switch(direction) {
        case 'desc':
          sorts[sort] = -1;
          break;
        case 'asc':
          sorts[sort] = 1;
          break;
        default:
          sorts['name'] = 1;
          break;
      }
    }

    if (cus_id) {
      filters['customer_id'] = cus_id;
    }
    if (status) {
      filters['status'] = status
    }
    if (order_code) {
      filters['order_code'] = order_code
    }

    const skip = (pageParam - 1) * sizeParam
    const total = await Order.find(filters).sort(sorts)
    let result;
    if (is_pagingParam) {
      result = await Order.find(filters).sort(sorts).skip(skip).limit(sizeParam);
      let number_page = 0
      if (total.length/sizeParam - total.length%sizeParam >= 0.5)
      {
          number_page = Math.ceil(parseInt((total.length / sizeParam - 0.5))) + 1
      }
      else
      {
          number_page = Math.ceil((total.length/sizeParam))
      }
      return {result, page_size: sizeParam, total_element: total.length, total_page: number_page, page: pageParam}
    } else {
      result = total;
      return result;
    }

  }
  async update({id, status}) {
    const orderInfo = await Order.findById(id)
    if (orderInfo.status != 0 && status == 3) {
      return {is_completed: false, msg:'Bạn không có quyền hủy đơn hàng này'}
    }
    let receive_date;
    if (status == 2) {
      receive_date = moment().utcOffset(420).format('DD/MM/YYYY')
    }
    const result = await Order.updateOne({_id: id}, {status: status, receive_date: receive_date})
    if (result) {
      return {is_completed: true, msg: "Cập nhật thành công"}
    }
    return {is_completed: false, msg:'Cập nhật thất bại'}
  }

  async getComparison() {
    const current_year = moment().year();
    const last_year = current_year - 1;
    const orderList = await Order.find()
    let last_year_value = Array(12).fill(0);
    let current_year_value = Array(12).fill(0);
    orderList.forEach((item) => {
      if (moment(item.receive_date, 'DD/MM/YYYY').year() === current_year) {
        let index = moment(item.receive_date, 'DD/MM/YYYY').month()
        current_year_value[index] += item.total_fee
      }
      if (moment(item.receive_date, 'DD/MM/YYYY').year() === last_year) {
        let index = moment(item.receive_date, 'DD/MM/YYYY').month()
        last_year_value[index] += item.total_fee
      }

    })
    return {last_year:last_year_value, current_year:current_year_value}
  }
};

const formatAmount = (amount) => {
  const handleAmount = amount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  return handleAmount;
};