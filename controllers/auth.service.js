import generatetoken from "../utils/token.js";


import { registerUser ,loginUser} from "../services/auth.service.js";

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    const user = await registerUser(username, email, password);

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export const login = async(req,res)=>{
  try {
     const {email,password}=req.body
      const user = await loginUser(email, password);
      console.log(user)

     const  token=generatetoken(user)

     res.json({
        message:"login successful",
        token,
        user
     })
  } catch (error) {

     res.status(400).json({error:error.message})
  }
}
