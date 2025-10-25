'use client'

import { useToolStore } from "@/store/toolStore";
import { useEffect, useState } from "react";
import { FaPencilAlt, FaEraser } from "react-icons/fa"
import { IoText } from "react-icons/io5";
import { RiRectangleLine } from "react-icons/ri"; 
import { Circle } from "lucide-react";

export default function Toolbar() {
    const { selectedTool, setSelectedTool } = useToolStore(); 

    useEffect(() => {
        console.log(selectedTool)
    }, [selectedTool])

    const tools = [
        {icon: <FaPencilAlt />, name: "pencil"}, 
        {icon: <FaEraser />, name: "eraser"}, 
        {icon: <IoText />, name: "text"}, 
        {icon: <RiRectangleLine />, name: 'rectangle'}, 
        {icon: <Circle />, name: 'circle'}
    ]

    return (
        <div className=" py-2 mt-4 gap-4  rounded-xl backdrop-blur-md shadow-lg shadow-gray-400 px-6 flex">
            {tools.map((item, index) => {
                return (
                    <div key={index} title={item.name}>
                        <button onClick={() => setSelectedTool(item.name)} className={`w-10 h-10 cursor-pointer hover:bg-[#E0DFFF] flex items-center justify-center rounded-2xl ${selectedTool === item.name ? "bg-[#E0DFFF]" : ""}`}>
                            {item.icon}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}