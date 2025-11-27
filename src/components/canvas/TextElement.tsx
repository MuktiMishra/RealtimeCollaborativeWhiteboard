'use client'

import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const TextElement = ({ isVisible, value, setValue, stageRef, valueRef }: {isVisible: boolean, value: string, setValue: Dispatch<SetStateAction<string>>, stageRef: any, valueRef: any }) => {

  
  const downloadPNGOfBoard = async () => {
    if (!stageRef.current) return alert("Sorry but right now downloads are not working."); 

    const base64 = stageRef.current.toDataURL({ pixelRatio: 2 }); 

    const link = document.createElement('a'); 
    link.download = "Image-stage.png"
    link.href = base64; 
    document.body.appendChild(link); 
    link.click(); 
    return document.body.removeChild(link); 

  }

  return (
    <motion.div 
    animate={{width: isVisible ? "25rem" : "0rem"}}
    transition={{ease: "linear", duration: 0.1}}
    className={`absolute shadow-md shadow-gray-300 backdrop-blur-sm min-w-0 left-0 top-0 overflow-hidden flex flex-col bg-white z-30 h-full`}>
      <h1 className='mt-4 text-3xl font-extrabold text-center tracking-tight'>Your Notes</h1>
      <div className='notes p-4 flex-1'>
        <textarea  value={value} onChange={(e) => {setValue(e.target.value);}} placeholder="This is a project..." className='w-full resize-none text-wrap h-full tracking-tighter font-mono outline-none'/>
      </div>
      <button onClick={() => downloadPNGOfBoard()} className='mb-6 mx-4 cursor-pointer hover:opacity-90 transition-opacity duration-250 text-center flex items-center justify-center h-10 bg-blue-600 text-white rounded-md'>Save as PDF</button>
    </motion.div>
  )
}

export default TextElement