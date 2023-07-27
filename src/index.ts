import { io } from './lib/io';

io.on('connection', (sokect) => {
  console.log(sokect);
});
