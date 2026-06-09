import jwt from "jsonwebtoken"

function generatetoken(user){
   return jwt.sign(
      { id: user.id, is_admin: user.is_admin || false },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
   )
}

export default generatetoken;
