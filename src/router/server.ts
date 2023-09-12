import express from 'express';
import {
  getAllChannelsCanSend,
  commitChannel,
  postChapterNotify,
  getServers,
} from '../controller/server';

const router = express.Router();

router.route('/').post(postChapterNotify);
router.route('/:userId').get(getServers);
router.route('/:id/:userId').get(getAllChannelsCanSend).post(commitChannel);

export default router;
