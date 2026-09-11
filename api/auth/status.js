import { isAdminRequest } from "../_lib/auth.js";

export default function handler(req, res) {
  return res.status(200).json({ isAdmin: isAdminRequest(req) });
}
