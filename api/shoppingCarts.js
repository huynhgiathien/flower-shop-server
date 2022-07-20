const validator = require('../middlewares/validator')
const ShoppingCartService = require('../services/shoppingCart.service').getInstance()
const authorize = require("../middlewares/authorize.js");

module.exports = (router) => {
  //Begin == Lấy thông tin giỏ hàng////
  router.get('/', authorize.verifyAccessToken, async (req,res)=>{
    try{
        const user_id = req.payload.id;
        const shoppingCart = await ShoppingCartService.getShoppingCartByCusId(user_id);
        const listShoppingCartDetail = await ShoppingCartService.getListShoppingCartDetailByShoppingCardId(shoppingCart?._id);
        if (shoppingCart && listShoppingCartDetail.length > 0)
        {
            return res.status(200).json ({shoppingCart, listShoppingCartDetail})
        }
        else
        {
          return res.status(200).json ({shoppingCart: {}, listShoppingCartDetail: []})
        }
    }
    catch(e)
    {
      console.log(e.message)
      return res.status(400).json ({msg:"Không tìm thấy giỏ hàng"})
    }
  })

    //Begin == Xóa giỏ hàng////
    router.delete('/', authorize.verifyAccessToken, async (req,res)=>{
      try{
          const {product_id} = req.body
          const cus_id = req.payload.id
          const result = await ShoppingCartService.deleteShoppingCartDetail({product_id, cus_id});
          if (result) {
            return res.status(200).json ({msg: "Xóa thành công"})
          }
          return res.status(400).json ({msg:"Không tìm thấy giỏ hàng"})
      }
      catch(e)
      {
        console.log(e.message)
      }
    })






  //Begin == Thêm vào giỏ hàng //
  router.post('/addProduct', async (req,res)=>{
    try {
        const {cus_id, product_id, quantity} = req.body
        let shoppingCart = await ShoppingCartService.getShoppingCartByCusId(cus_id);
        const result = await ShoppingCartService.updateShoppingCartDetail ({shoppingCart, product_id: product_id, quantity: quantity, cus_id})

        return res.json({code:200,message:"Thêm giỏ hàng thành công", result});
    }
    catch(e)
    {
      console.log(e.message)
    }
  })
  //End == Thêm vào giỏ hàng //

    //Begin == Thay đổi số lượng hàng trong giỏ hàng //
    router.put('/updateProduct', authorize.verifyAccessToken, async (req,res)=>{
      try {
          let {carts} = req.body
          // carts = JSON.parse(carts)
          console.log('this is carts', carts)
          const cus_id = req.payload.id
          await ShoppingCartService.updateProduct (cus_id, carts)
  
          return res.status(200).json({message:"Cập nhật giỏ hàng thành công"});
      }
      catch(e)
      {
        console.log(e.message)
      }
    })
    //End == Thêm vào giỏ hàng //
}