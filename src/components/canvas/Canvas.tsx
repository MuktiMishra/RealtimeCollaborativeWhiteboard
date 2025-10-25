'use client'

import { Stage, Layer, Line, Rect, Circle } from 'react-konva'
import Toolbar from './Toolbar';
import { useCurrentShapeStore, useToolStore } from '@/store/toolStore';
import { MdCopyAll } from "react-icons/md";
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs' 
import { WebsocketProvider } from 'y-websocket';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MdCheck } from "react-icons/md";
import { motion, AnimatePresence } from "motion/react";

interface elementSchema {
    tool: string, 
    props: any
}

const Canvas = ({roomId}: {roomId: string}) => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const {tool, props} = useCurrentShapeStore(); 
    const { selectedTool } = useToolStore(); 
    const [dimensions, setDimensions] = useState({width: 0, height: 0}); 
    const [elements, setElements] = useState<elementSchema[]>([])
    const [roomInfo, setRoomInfo] = useState<any>(null)
    const [copied, setCopied] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const isPencilDrawing = useRef(false); 
    const isShapeDrawing = useRef(false); 
    const yDocRef = useRef<Y.Doc | null>(null)
    const providerRef = useRef<WebsocketProvider | null>(null)
    const yElementsRef = useRef<Y.Array<elementSchema> | null>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    useEffect(() => {
        if (status === 'authenticated') {
            fetchRoomInfo()
            loadElementsFromDB()
        }
    }, [status, roomId])

    const fetchRoomInfo = async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}`)
            if (response.ok) {
                const data = await response.json()
                setRoomInfo(data)
            }
        } catch (error) {
            console.error('Failed to fetch room info:', error)
        }
    }

    const loadElementsFromDB = async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}/elements`)
            if (response.ok) {
                const dbElements = await response.json()
                
                // Initialize Y.js array with DB elements
                const yElements = yElementsRef.current
                if (yElements && dbElements.length > 0 && yElements.length === 0) {
                    yElements.push(dbElements)
                }
            }
        } catch (error) {
            console.error('Failed to load elements from DB:', error)
        }
    }

    const saveElementsToDB = async (elementsToSave: elementSchema[]) => {
        try {
            setIsSaving(true)
            const response = await fetch(`/api/rooms/${roomId}/elements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ elements: elementsToSave }),
            })

            if (response.ok) {
                setLastSaved(new Date())
            }
        } catch (error) {
            console.error('Failed to save elements to DB:', error)
        } finally {
            setIsSaving(false)
        }
    }

    // Debounced save function
    const debouncedSave = (elementsToSave: elementSchema[]) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveElementsToDB(elementsToSave)
        }, 2000) // Save after 2 seconds of inactivity
    }

    useEffect(() => {
        if (window !== undefined || window !== null) {
            setDimensions({width: window.innerWidth, height: window.innerHeight})
        }
    }, [])

    useEffect(() => {
        if (tool === '') return; 
        const lastId = elements.length > 0 ? (elements[elements.length - 1].props.id) : '0'; 
        const currentId = (Number(lastId) + 1).toString(); 
        props.id = currentId; 
        setElements([{tool: tool, props}])
        handleAddElement({tool, props})
        
    }, [tool, props])

    useEffect(() => {
        const yDoc = new Y.Doc(); 
        const webSocketProvider = new WebsocketProvider("wss://demos.yjs.dev", `whiteboard-${roomId}`, yDoc); 
        const yElements = yDoc.getArray<elementSchema>("elements"); 

        yDocRef.current = yDoc; 
        providerRef.current = webSocketProvider; 
        yElementsRef.current = yElements; 

        const updateElements = () => {
            const currentElements = yElements.toArray()
            setElements([...currentElements])
            
            // Trigger debounced save when elements change
            if (currentElements.length > 0) {
                debouncedSave(currentElements)
            }
        }
        
        yElements.observe(updateElements)
        updateElements(); 

        return () => {
            yElements.unobserve(updateElements); 
            webSocketProvider.destroy();
            yDoc.destroy()
            
            // Clear save timeout on cleanup
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [roomId])

    const handleAddElement = (element: elementSchema) => {
        yElementsRef.current?.push([element]); 
    }

    const handleMouseDown = (e: any) => {
        switch(selectedTool) {
            case 'pencil': {
                isPencilDrawing.current = true; 
                const point = e.target.getStage().getPointerPosition()
                const props = {id: elements.length + 1, points: [Number(point.x), Number(point.y)]}
                setElements([{tool: selectedTool, props}])
                handleAddElement({tool: selectedTool, props})
                break; 
            } 
            case 'eraser': {
                isPencilDrawing.current = true; 
                const point = e.target.getStage().getPointerPosition()
                const props = {id: elements.length + 1, points: [point.x, point.y]}
                setElements([{tool: selectedTool, props}])
                handleAddElement({tool: selectedTool, props})
                break; 
            } 
            case 'rectangle': {
                const point = e.target.getStage().getPointerPosition();
                const props = {id: (elements.length + 1).toString(), x: point.x, y: point.y, width: 0, height: 0, stroke: 'black' }; 
                isShapeDrawing.current = true; 
                setElements(prev => [...prev, {tool: selectedTool, props}]); 
                handleAddElement({tool: selectedTool, props}); 
                break;
            } 
            case 'circle': {
                const point = e.target.getStage().getPointerPosition(); 
                const props = {id: (elements.length + 1).toString(), x: point.x, y: point.y, radius: 0, stroke: 'black'}
                isShapeDrawing.current = true; 
                setElements(prev => [...prev, {tool: selectedTool, props}])
                handleAddElement({tool: selectedTool, props})
                break;
            }
        }   
    }

    const handleMouseMove = (e: any) => {
        switch(selectedTool) {
            case 'pencil': {
                if (!isPencilDrawing.current) return; 
                const stage = e.target.getStage(); 
                const point = stage.getPointerPosition(); 
                const yElements = yElementsRef.current; 

                if (!yElements || yElements.map((item) => item.tool === "pencil").length === 0) return; 
                let lastIndex = 0; 
                yElements.forEach((item, idx) => {
                    if (item.tool === 'pencil') lastIndex = idx; 
                })  

                let lastLine = yElements.get(lastIndex); 
                const updatedLinePoints = {
                    points: [...lastLine.props.points, point.x, point.y] 
                }

                yElements.doc?.transact(() => {
                    yElements.delete(lastIndex); 
                    yElements.insert(lastIndex, [{tool: 'pencil', props: updatedLinePoints}])
                })
                break; 
            }
            case 'eraser': {
                if (!isPencilDrawing.current) return; 
                const stage = e.target.getStage(); 
                const point = stage.getPointerPosition(); 
                const yElements = yElementsRef.current; 

                if (!yElements || yElements.map((item) => item.tool === "eraser").length === 0) return; 
                let lastIndex = 0; 
                yElements.forEach((item, idx) => {
                    if (item.tool === 'eraser') lastIndex = idx; 
                })  

                let lastLine = yElements.get(lastIndex); 
                const updatedLinePoints = {
                    points: [...lastLine.props.points, point.x, point.y] 
                }

                yElements.doc?.transact(() => {
                    yElements.delete(lastIndex); 
                    yElements.insert(lastIndex, [{tool: 'eraser', props: updatedLinePoints}])
                })
                break; 
            } 
            case 'rectangle': {
                if (!isShapeDrawing.current) return; 
                const pointer = e.target.getStage().getPointerPosition(); 
                const copy = [...elements]; 
                let element = copy[elements.length - 1]; 
                const newWidth = pointer.x - element.props.x; 
                const newHeight = pointer.y - element.props.y; 
                element.props.width = newWidth; 
                element.props.height = newHeight; 

                copy.splice(elements.length - 1, 1, element)
                setElements(copy); 
                let lastIndex = 0; 
                yElementsRef.current?.forEach((item, idx) => {
                    if (item.tool === 'rectangle') lastIndex = idx; 
                })

                yElementsRef.current?.doc?.transact(() => {
                    yElementsRef.current?.delete(lastIndex); 
                    yElementsRef.current?.insert(lastIndex, [element]); 
                })
                break; 
            }
            case 'circle': {
                if (!isShapeDrawing.current) return; 
                const pointer = e.target.getStage().getPointerPosition(); 
                const copy = [...elements]; 
                let element = copy[elements.length - 1]; 
                
                const dx = pointer.x - element.props.x;
                const dy = pointer.y - element.props.y;
                const newRadius = Math.round(Math.sqrt(dx * dx + dy * dy));

                element.props.radius = newRadius; 

                copy.splice(elements.length - 1, 1, element); 
                setElements(copy); 
                let lastIndex = 0; 

                yElementsRef.current?.forEach((item, idx) => {
                    if (item.tool === 'circle') lastIndex = idx; 
                })

                yElementsRef.current?.doc?.transact(() => {
                    yElementsRef.current?.delete(lastIndex); 
                    yElementsRef.current?.insert(lastIndex, [element])
                })
                break; 
            }
            default: return; 
        }
    }

    const handleMouseUp = () => {
        if (selectedTool === "pencil" || selectedTool === "eraser") {
            isPencilDrawing.current = false; 
        } else {
            isShapeDrawing.current = false; 
        }
    }

    const copyRoomLink = async () => {
        const link = `${window.location.origin}/home/${roomId}`
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClearCanvas = async () => {
        if (confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
            try {
                // Clear Y.js array
                const yElements = yElementsRef.current
                if (yElements) {
                    yElements.delete(0, yElements.length)
                }
                
                // Clear from DB
                await fetch(`/api/rooms/${roomId}/elements`, {
                    method: 'DELETE',
                })
            } catch (error) {
                console.error('Failed to clear canvas:', error)
            }
        }
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        )
    }

    return (
        <div>
            <div className="py-0 flex justify-between items-center">
                <div className="w-1/2 h-10">
                    <div className="ml-10 max-w-2xl">
                        <div className="bg-white flex h-20 rounded-xl shadow-lg border border-gray-100 p-4 space-y-3">

                            <div className="flex items-center gap-2 mr-6">
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {roomInfo?.name || 'Untitled Whiteboard'}
                                </h2>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    Live
                                </span>
                                {isSaving && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                        Saving...
                                    </span>
                                )}
                                {lastSaved && !isSaving && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                        Saved {lastSaved.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                            
                            {/* Share Link Section */}
                            <div className="space-y-2 flex items-center gap-2">
                            <label className="text-xs  font-medium text-gray-500 uppercase tracking-wider">
                                Share Link
                            </label>
                            <div className="relative group">
                                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg px-4 py-3 transition-all group-hover:border-blue-300">
                                <input
                                    type="text"
                                    value={`${window.location.origin}/home/${roomId}`}
                                    readOnly
                                    className="flex-1 bg-transparent text-sm text-gray-700 font-mono outline-none select-all"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={copyRoomLink}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-sm transition-all ${
                                    copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div
                                        key="check"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 180 }}
                                        className="flex items-center gap-1"
                                        >
                                        <MdCheck size={18} />
                                        <span>Copied</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                        key="copy"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="flex items-center gap-1"
                                        >
                                        <MdCopyAll size={18} />
                                        <span>Copy</span>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </motion.button>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                </div>
                <Toolbar />
                <div className="h-10 w-1/2 flex justify-end gap-2 pr-10">
                    <button
                        onClick={handleClearCanvas}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Clear Canvas
                    </button>
                    <button
                        onClick={() => router.push('/home/dashboard')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
            <div>
                <Stage onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} width={dimensions.width} height={dimensions.height}>
                    <Layer>
                        {elements.map((item, i) => {
                            switch(item.tool) {
                                case 'pencil':
                                case 'eraser': {
                                    return <Line 
                                    key={i}
                                    id={item.props.id}
                                    points={item.props.points}
                                    stroke="#df4b26"
                                    strokeWidth={5} 
                                    tension={0.5}
                                    lineCap="round"
                                    lineJoin="round"
                                    globalCompositeOperation={item.tool === 'eraser' ? "destination-out" : "source-over"}
                                    />
                                }
                                case 'rectangle': {
                                    return <Rect 
                                    key={i}
                                    id={item.props.id} 
                                    x={item.props.x}
                                    y={item.props.y}
                                    width={item.props.width}
                                    height={item.props.height}
                                    stroke={item.props.stroke}
                                    />
                                } 
                                case 'circle': {
                                    return <Circle 
                                    key={i}
                                    id={item.props.id}
                                    x={item.props.x}
                                    y={item.props.y}
                                    radius={item.props.radius}
                                    stroke={item.props.stroke}
                                    />
                                }
                            }
                        })}
                    </Layer>
                </Stage>
            </div>
        </div>
    )
}

export default Canvas;