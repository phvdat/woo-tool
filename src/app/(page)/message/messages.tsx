'use client';

import { socket } from '@/config/socket';
import React, { useEffect, useMemo, useState } from 'react';

export default function Messages() {
  const [counter, setCounter] = useState(0);

  console.log('the socket', socket.connected);
  useEffect(() => {
    socket.emit('message', 'Tushar');

    socket.on('add', (payload) => {
      setCounter((prev) => prev + 1);
    });
    socket.on('minus', (payload) => {
      setCounter((prev) => prev - 1);
    });
  }, []);

  const handleClick = (type: string) => {
    if (type === 'add') {
      socket.emit('add', 1);
    } else {
      socket.emit('minus', 1);
    }
  };

  return (
    <div className='h-screen flex justify-center items-center flex-col'>
      <h1 className='text-5xl font-bold'>{counter}</h1>
      <div className='flex space-x-4 items-center mt-10'>
        <button
          className='py-2 px-6  rounded-md bg-green-400 text-white'
          onClick={() => handleClick('add')}
        >
          Add
        </button>
        <button
          className='py-2 px-6 rounded-md bg-red-400 text-white'
          onClick={() => handleClick('minus')}
        >
          Minus
        </button>
      </div>
    </div>
  );
}
