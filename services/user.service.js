"use strict";

const createError = require("http-errors");
const bcrypt = require("bcrypt");
const BaseService = require("./base.service");
const User = require("../models/user.model.js");
const _ = require("lodash")

module.exports = class UserService extends BaseService {
  constructor() {
    super();
  }
  async get(userId) {
    try {
      const user = await User.findById(userId, { password: 0 });

      return user;
    } catch (err) {
      return "There was a problem finding the user.";
    }
  }

  async list({sort, direction, type, is_paging = true, page, size}) {
    try {
      const pageParam = page ? parseInt(page) : 1
      const sizeParam = size ? parseInt(size) : 9
      const is_pagingParam = JSON.parse(is_paging)
      let sorts = {}
      let filters = {}
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

      if (type != null && type != undefined) {
        filters['type'] = type
      }
      const total = await User.find(filters).sort(sorts)
      let result
      if (is_pagingParam) {
        const skip = (pageParam - 1) * sizeParam
        result = await User.find(filters).sort(sorts).skip(skip).limit(sizeParam);
        let number_page = 0
        if (total.length/size - total.length%sizeParam >= 0.5)
        {
            number_page = Math.ceil(parseInt((total.length / sizeParam - 0.5))) + 1
        }
        else
        {
            number_page = Math.ceil((total.length/sizeParam))
        }
        return {result, page_size: sizeParam, total_element: total.length, total_page: number_page, page: pageParam}
      } else {
        result = total
        return result
      }
    } catch (err) {
      console.log(err)
      return "There was a problem finding the user.";
    }
  }

  async signup(userInfo) {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      birthdate,
    } = userInfo;
    const emailExist = email && (await User.findOne({ email: email }));
    if (emailExist) {
      throw createError.Conflict(`${email} is ready been registered`);
    }

    const phoneExist = phone && (await User.findOne({ phone: phone }));
    if (phoneExist) {
      throw createError.Conflict(`${phone} is ready been registered`);
    }

    const userCreated = await User.create({
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      type: 0,
      phone: phone,
      address: address,
      birthdate: birthdate,
    });

    return userCreated;
  }

  async create(userInfo) {
    const {
      email,
    } = userInfo;
    const emailExist = email && (await User.findOne({ email: email }));
    if (emailExist) {
      throw createError.Conflict(`${email} is ready been registered`);
    }

    const userCreated = await User.create({
      email: email,
      password: '12345678',
      type: 2,
    });

    return userCreated;
  }

  async login(userInfo) {
    const { email, password } = userInfo;
    const user = await User.findOne({ email: email });
    const passwordIsValid = await user?.isCheckPassword(password);
    if (!user) return;
    if (!passwordIsValid) return;
    return user;
  }

  async logout(refreshToken) {
    if(!refreshToken) throw createError.BadRequest()
    await User.deleteOne({token: refreshToken})
    return 'Logout!'
  }

  async update(id, userInfo) {
    const { phone, lastName, firstName, address, birthdate} = userInfo;
    return await User.updateOne({ _id: id }, {phone, lastName, firstName});

  }

  async updatePassword({id, oldPassword, newPassword}) {
    const salt = await bcrypt.genSalt(10); // Add string to password
    const hashedPassword = await bcrypt.hash(newPassword,salt);
    const user = await User.findById(id);
    const passwordIsValid = await user.isCheckPassword(oldPassword);
    if (!passwordIsValid) return {is_completed: false, msg: "Mật khẩu cũ không chính xác!!!"}
    await User.updateOne({ id }, {password: hashedPassword});
    return {is_completed: true, msg: "Thay đổi mật khẩu thành công"}
  }

  // async login (userInfo) {
  //   const {userName, password} = userInfo;
  //   const userNameExist = await User.findOne({userName: userName})
  //   if(userNameExist)
  //   {
  //   		throw createError.Conflict(`${userName} is ready been registered`);
  //   }

  //   const emailExist = await User.findOne({email: email})
  //   if(emailExist)
  //   {
  //   		throw createError.Conflict(`${email} is ready been registered`);
  //   }

  //   const phoneExist = await User.findOne({phone: phone})
  //   if(phoneExist)
  //   {
  //   		throw createError.Conflict(`${phone} is ready been registered`);
  //   }

  //   const userCreated = await User.create({
  //     userName: userName,
  //     password: password,
  //     type: parseInt(type),
  //     email: email,
  //     phone: phone,
  //     address: address,
  //     birthdate: birthdate,
  //   });

  //   return userCreated
  // }
};
