const mongoose = require('mongoose');
const schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const {mongo} = require('../connections/mongo')

const UserSchema = new schema ({
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: false
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  address: {
    type: String,
    required: false,
  },
  birthdate: {
    type: Date,
    required: false,
  },
  phone: {
      type: String,
      required: false
  },
  type: {
    type: Number,
    required: true
}

});

UserSchema.pre('save', async function(next) {
  try{
    const salt = await bcrypt.genSalt(10); // Add string to password
    const hashedPassword = await bcrypt.hash(this.password,salt);
    this.password = hashedPassword;
    next();
  }
  catch(error){
    next(error);
  }
})

UserSchema.methods.isCheckPassword = async function(password) {
  try {
      return await bcrypt.compare(password, this.password)
  }
  catch(error){

  }
}

module.exports = mongo.model('user', UserSchema);