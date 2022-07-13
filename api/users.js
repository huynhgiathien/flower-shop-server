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

        var token = jwt.sign(
          { id: result._id, type: user.type },
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

  router.post('/logout', function(req, res) {
    res.cookie('jwt', '', { maxAge: 1 });
    res.status(200).json({ auth: false, token: null });
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
}
