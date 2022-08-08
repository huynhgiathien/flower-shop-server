const Schema = require('validate')

module.exports = (schema) => {
    const validator = new Schema(schema)
    return (req, res, next) => {
        const errors = validator.validate(req.body)
        console.log(errors)
        if(errors.length > 0) {
            next(errors)
        } else {
            next()
        }
    }
}