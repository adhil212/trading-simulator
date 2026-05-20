import jwt from "jsonwebtoken"

function generatetoken(user){
   return jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
   )
}

export default generatetoken;
