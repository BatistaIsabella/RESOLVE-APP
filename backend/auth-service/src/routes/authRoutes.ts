import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { loginRateLimiter } from '../middlewares/loginRateLimiter';

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimiter, login);

export default router;
