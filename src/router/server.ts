import express from 'express';
import {
  getAllChannelsCanSend,
  commitChannel,
  postChapterNotify,
} from '../controller/server';

const router = express.Router();

router.route('/').post(postChapterNotify);
router.route('/:id/:userId').get(getAllChannelsCanSend).post(commitChannel);

export default router;
