const jwt = require("jsonwebtoken");
const validator = require("../middlewares/validator");
const UserService = require("../services/user.service").getInstance();
const authorize = require("../middlewares/authorize.js");
const { secret } = require("../config.json");

module.exports = (router) => {
  router.post(
    "/register",
    validator({
      email: {
        type: "string",
        required: true,
      },
      password: {
        type: "string",
        required: true,
      },
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      phone: {
        type: "string",
        required: true,
      },
      address: {
        type: "string",
        required: false,
      },
      birthdate: {
        type: "string",
        required: false,
      },
    }),
    async (req, res, next) => {
      try {
        const result = await UserService.signup(req.body);
        const userId = result._id;
        const user = await UserService.get(userId);

        let token = jwt.sign(
          { id: result._id },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: 86400, // expires in 24 hours
          }
        );
        res.cookie("jwt", token, { maxAge: 86400 });

        return res.status(200).json({
          message: "Successful",
          token: token,
          type: user.type,
        });
      } catch (error) {
        console.log(error);
        return res.status(404).json({
          message: "Fail",
          error: error.message,
        });
      }
    }
  );

  router.post(
    "/login",
    validator({
      email: {
        type: "string",
        required: true,
      },
      password: {
        type: "string",
        required: true,
      },
    }),
    async (req, res, next) => {
      try {
        const result = await UserService.login(req.body);
        if (!result) {
          return res.status(401).json({
            message: "Fail",
            error: "Incorrect account or password",
          });
        }

        const userId = result._id;
        const user = await UserService.get(userId);
        const token = await authorize.signAccessToken(user._id, user.type)
        const refreshToken = await authorize.signRefreshToken(user._id)

        res.cookie("jwt", token, { maxAge: 86400 });

        return res.status(200).json({
          message: "Successful",
          token: token,
          refreshToken,
          type: user.type,
        });
      } catch (error) {
        console.log(error);
        return res.status(404).json({
          message: "Fail",
          error: error.message,
        });
      }
    }
  );

  router.post('/logout', async function(req, res) {
    const {refreshToken} = req.body
    await UserService.logout(refreshToken)
    res.cookie('jwt', '', { maxAge: 1 });
    res.status(200).json({ auth: false, token: null });
  });

  router.get("/", authorize.verifyAccessToken, async (req, res, next) => {
    try {
      console.log(req.payload)
      const type = req.payload.type;
      if (type == 1  || type == 0) {
        return res.status(400).json({msg: "Bạn không có quyền xem danh sách tài khoản"})
      }
      const user = await UserService.list(req.query);
      if (!user) return res.status(404).json("No user found.");
      return res.status(200).json({ user: user });
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        message: "Fail",
        error: error.message,
      });
    }
  });

  router.get("/me", authorize.verifyAccessToken, async (req, res, next) => {
    try {
      const _id = req.payload.id;
      console.log("helooooooooooooooooooooo", req.payload);
      const user = await UserService.get(_id);
      console.log("this is user", user);
      if (!user) return res.status(404).json("No user found.");
      return res.status(200).json({ user: user });
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        message: "Fail",
        error: error.message,
      });
    }
  });

  router.put("/", authorize.verifyAccessToken, async (req, res, next) => {
    try {
      const _id = req.payload.id;
      const user = await UserService.update(_id, req.body);
      if (!user) return res.status(404).json("No user found.");
      return res.status(200).json({ msg: "Thay đổi thông tin thành công" });
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        message: "Fail",
        error: error.message,
      });
    }
  });

  router.put("/change-password", authorize.verifyAccessToken, async (req, res, next) => {
    try {
      const _id = req.payload.id;
      const {oldPassword, newPassword} = req.body
      const result = await UserService.updatePassword({id:_id, oldPassword, newPassword});
      if (!result.is_completed) return res.status(400).json({msg: result.msg});
      return res.status(200).json({msg: result.msg});
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        message: "Fail",
        error: error.message,
      });
    }
  });

  router.post("/create", authorize.verifyAccessToken, async (req, res, next) => {
    try {
      console.log(req.payload)
      const type = req.payload.type;
      if (type != 3) {
        return res.status(400).json({msg: "Bạn không có quyền để tạo tài khoản"})
      }
      const {email} = req.body
      const result = await UserService.create({email});
      if (!result) return res.status(400).json({msg: "Tạo tài khoản thất bai (Server error) !!!"});
      return res.status(200).json({msg: "Tạo tài khoản thành công"});
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        message: "Fail",
        error: error.message,
      });
    }
  });

  router.post("/refresh-token", async (req, res, next) => {
    try{
      const {refreshToken} = req.body
      if(!refreshToken){
          throw createError.BadRequest();
          
      }
      
      const {userId, type} = await authorize.verifyRefreshToken(refreshToken);
      const accessToken = await authorize.signAccessToken(userId, type);
      const newRefreshToken = await authorize.signRefreshToken(userId, type);
      res.json({accessToken, refreshToken:newRefreshToken});
  }
  catch(error)
  {
      next(error);
  }
  });
}
