'use client'

import { Stage, Layer, Line, Rect, Circle, Arrow } from 'react-konva'
import Toolbar from './Toolbar';
import { useCurrentShapeStore, useToolStore } from '@/store/toolStore';
import { MdCopyAll, MdCheck, MdVideocam, MdVideocamOff, MdMic, MdMicOff, MdScreenShare, MdStopScreenShare } from "react-icons/md";
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs' 
import { WebsocketProvider } from 'y-websocket';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "motion/react";
import { RiArchiveDrawerFill } from 'react-icons/ri';
import TextElement from './TextElement';

interface elementSchema {
    tool: string, 
    props: any
}

interface Participant {
    id: string;
    name: string;
    stream?: MediaStream;
    videoEnabled: boolean;
    audioEnabled: boolean;
}

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'call-state' | 'request-offer';
    from: string;
    to?: string;
    data?: any;
    userName?: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
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
    const [isTextElementVisible, setIsTextElementVisible] = useState(false); 
    const [textElemValue, setTextElemValue] = useState(""); 
    const textToSend = useRef(""); 

    const [isVideoEnabled, setIsVideoEnabled] = useState(false)
    const [isAudioEnabled, setIsAudioEnabled] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [showParticipants, setShowParticipants] = useState(true)
    const [isConnecting, setIsConnecting] = useState(true)
    
    const isPencilDrawing = useRef(false); 
    const isShapeDrawing = useRef(false); 
    const yDocRef = useRef<Y.Doc | null>(null)
    const providerRef = useRef<WebsocketProvider | null>(null)
    const yElementsRef = useRef<Y.Array<elementSchema> | null>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const stageRef = useRef(null); 
    
    // WebRTC refs - Fixed version
    const localStreamRef = useRef<MediaStream | null>(null)
    const screenStreamRef = useRef<MediaStream | null>(null)
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const signalingRef = useRef<Y.Map<any> | null>(null)
    const myUserIdRef = useRef<string>('')
    const makingOfferRef = useRef<Set<string>>(new Set())
    const politeRef = useRef<boolean>(false)
    const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())

    // ICE servers configuration
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10
    }

    useEffect(() => {
        
    }, [])

    useEffect(() => {
        console.log("text value: ", textElemValue)
        textToSend.current = textElemValue; 
    }, [textElemValue])

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    useEffect(() => {
        if (status === 'authenticated') {
            const userId = `${session?.user?.email || 'user'}-${Date.now()}`
            myUserIdRef.current = userId
            // Set polite based on userId comparison (lexicographical order)
            politeRef.current = false // Will be set when another user joins
            fetchRoomInfo()
            loadElementsFromDB()
            // Auto-join voice channel like Discord
            initializeMediaAndJoin()
        }
    }, [status, roomId, session])

    const fetchRoomInfo = async () => {
        try {
            const response = await fetch(`/api/rooms/${roomId}`)
            if (response.ok) {
                const data = await response.json()
                console.log("data: ", data)
                setRoomInfo(data)
                setTextElemValue(data.notes); 
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
            console.log("text to send: ", textToSend)
            setIsSaving(true)
            const response = await fetch(`/api/rooms/${roomId}/elements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ elements: elementsToSave, text: textToSend.current.toString() }),
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

    const debouncedSave = (elementsToSave: elementSchema[]) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveElementsToDB(elementsToSave)
        }, 2000)
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
        
        const newElement = {tool: tool, props: {...props}}
        handleAddElement(newElement)
        
    }, [tool, props])

    // Setup Yjs and WebRTC signaling
    useEffect(() => {
        const yDoc = new Y.Doc(); 
        const webSocketProvider = new WebsocketProvider('ws://localhost:1234', `whiteboard-${roomId}`, yDoc); 
        const yElements = yDoc.getArray<elementSchema>("elements"); 
        const ySignaling = yDoc.getMap('webrtc-signaling')

        yDocRef.current = yDoc; 
        providerRef.current = webSocketProvider; 
        yElementsRef.current = yElements; 
        signalingRef.current = ySignaling

        const updateElements = () => {
            console.log("came here broski")
            const currentElements = yElements.toArray()
            setElements([...currentElements])

            if (currentElements.length > 0) {
                debouncedSave(currentElements)
            }
        }
        
        yElements.observe(updateElements)
        updateElements(); 

        // Setup signaling observer
        const handleSignaling = (event: any) => {
            event.keysChanged.forEach((key: string) => {
                const message = ySignaling.get(key) as SignalingMessage
                if (!message) return
                
                // Handle broadcast messages or messages specifically for us
                if (!message.to || message.to === myUserIdRef.current) {
                    if (message.from !== myUserIdRef.current) {
                        handleSignalingMessage(message)
                    }
                }
            })
        }

        ySignaling.observe(handleSignaling)

        // Clean old signaling messages periodically
        const cleanupInterval = setInterval(() => {
            const now = Date.now()
            ySignaling.forEach((value, key) => {
                if (key.includes('-')) {
                    const timestamp = parseInt(key.split('-')[1] || '0')
                    if (now - timestamp > 30000) { // Clean messages older than 30 seconds
                        ySignaling.delete(key)
                    }
                }
            })
        }, 10000)

        return () => {
            clearInterval(cleanupInterval)
            yElements.unobserve(updateElements); 
            ySignaling.unobserve(handleSignaling)
            webSocketProvider.destroy();
            yDoc.destroy()
            
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [roomId])

    // Cleanup on unmount - leave voice channel
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                sendSignalingMessage({
                    type: 'user-left',
                    from: myUserIdRef.current
                })
                
                localStreamRef.current.getTracks().forEach(track => track.stop())
            }
            
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop())
            }
            
            peerConnectionsRef.current.forEach(pc => pc.close())
        }
    }, [])

    // WebRTC Signaling - Fixed version
    const sendSignalingMessage = (message: SignalingMessage) => {
        if (!signalingRef.current) return
        
        const messageId = `${message.from}-${Date.now()}-${Math.random()}`
        signalingRef.current.set(messageId, message)
    }

    const handleSignalingMessage = async (message: SignalingMessage) => {
        console.log('Received signaling message:', message.type, 'from:', message.from)

        switch (message.type) {
            case 'user-joined':
                // Determine who should create the offer based on ID comparison
                politeRef.current = myUserIdRef.current < message.from
                
                if (message.from !== myUserIdRef.current && localStreamRef.current) {
                    // Update participant list
                    updateParticipantState(
                        message.from,
                        message.userName || 'Unknown',
                        message.videoEnabled || false,
                        message.audioEnabled || false
                    )
                    
                    // Only the impolite peer creates the initial offer
                    if (!politeRef.current) {
                        console.log('Creating initial offer for new user:', message.from)
                        await createPeerConnection(message.from, true)
                    } else {
                        // Polite peer waits for offer
                        console.log('Waiting for offer from:', message.from)
                        await createPeerConnection(message.from, false)
                    }
                    
                    // Send our current state
                    broadcastCallState()
                }
                break

            case 'request-offer':
                // Handle request for a new offer (used for renegotiation)
                if (message.from !== myUserIdRef.current) {
                    const pc = peerConnectionsRef.current.get(message.from)
                    if (pc) {
                        await createAndSendOffer(pc, message.from)
                    }
                }
                break

            case 'offer':
                await handleOffer(message.from, message.data)
                break

            case 'answer':
                await handleAnswer(message.from, message.data)
                break

            case 'ice-candidate':
                await handleIceCandidate(message.from, message.data)
                break

            case 'user-left':
                handleUserLeft(message.from)
                break

            case 'call-state':
                updateParticipantState(
                    message.from, 
                    message.userName || 'Unknown', 
                    message.videoEnabled || false, 
                    message.audioEnabled || false
                )
                break
        }
    }

    const createPeerConnection = async (userId: string, createOffer: boolean) => {
        // Don't create connection to ourselves
        if (userId === myUserIdRef.current) {
            console.log('Skipping self connection')
            return null
        }

        // Check if connection already exists
        let peerConnection = peerConnectionsRef.current.get(userId)
        if (peerConnection) {
            console.log('Connection already exists for:', userId)
            return peerConnection
        }

        console.log('Creating new peer connection for:', userId)
        peerConnection = new RTCPeerConnection(iceServers)
        peerConnectionsRef.current.set(userId, peerConnection)

        // Add local stream tracks if available
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                console.log('Adding local track:', track.kind, 'to peer:', userId)
                peerConnection!.addTrack(track, localStreamRef.current!)
            })
        }

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            console.log('Received remote track from:', userId, 'kind:', event.track.kind)
            const remoteStream = event.streams[0]
            
            setParticipants(prev => {
                const existing = prev.find(p => p.id === userId)
                if (existing) {
                    return prev.map(p => p.id === userId ? {...p, stream: remoteStream} : p)
                } else {
                    return [...prev, {
                        id: userId,
                        name: userId.split('-')[0],
                        stream: remoteStream,
                        videoEnabled: true,
                        audioEnabled: true
                    }]
                }
            })
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to:', userId)
                sendSignalingMessage({
                    type: 'ice-candidate',
                    from: myUserIdRef.current,
                    to: userId,
                    data: event.candidate.toJSON()
                })
            }
        }

        // Handle negotiation needed
        peerConnection.onnegotiationneeded = async () => {
            console.log('Negotiation needed with:', userId)
            try {
                // Only create offer if we're not already making one and we're the impolite peer
                if (!makingOfferRef.current.has(userId) && !politeRef.current) {
                    makingOfferRef.current.add(userId)
                    await createAndSendOffer(peerConnection!, userId)
                    makingOfferRef.current.delete(userId)
                }
            } catch (error) {
                console.error('Error during negotiation:', error)
                makingOfferRef.current.delete(userId)
            }
        }

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state with', userId, ':', peerConnection!.connectionState)
            
            if (peerConnection!.connectionState === 'connected') {
                setIsConnecting(false)
                // Apply any pending candidates
                const pending = pendingCandidatesRef.current.get(userId)
                if (pending) {
                    pending.forEach(candidate => {
                        peerConnection!.addIceCandidate(new RTCIceCandidate(candidate))
                    })
                    pendingCandidatesRef.current.delete(userId)
                }
            } else if (peerConnection!.connectionState === 'failed') {
                // Try to reconnect
                console.log('Connection failed, attempting reconnect with:', userId)
                peerConnection!.restartIce()
            } else if (peerConnection!.connectionState === 'closed') {
                handleUserLeft(userId)
            }
        }

        // Handle ICE connection state
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state with', userId, ':', peerConnection!.iceConnectionState)
        }

        if (createOffer) {
            await createAndSendOffer(peerConnection, userId)
        }

        return peerConnection
    }

    const createAndSendOffer = async (peerConnection: RTCPeerConnection, userId: string) => {
        try {
            const offer = await peerConnection.createOffer()
            await peerConnection.setLocalDescription(offer)
            
            console.log('Sending offer to:', userId)
            sendSignalingMessage({
                type: 'offer',
                from: myUserIdRef.current,
                to: userId,
                data: offer
            })
        } catch (error) {
            console.error('Error creating offer:', error)
        }
    }

    const handleOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
        console.log('Handling offer from:', from)
        
        let peerConnection = peerConnectionsRef.current.get(from)
        const offerCollision = makingOfferRef.current.has(from) && 
                              peerConnection?.signalingState !== 'stable'
        
        // If we're the polite peer and there's a collision, accept the offer
        if (offerCollision) {
            if (politeRef.current) {
                console.log('Offer collision detected, polite peer accepting offer')
                makingOfferRef.current.delete(from)
                // Rollback local offer
                if (peerConnection) {
                    await peerConnection.setLocalDescription({type: 'rollback'})
                }
            } else {
                console.log('Offer collision detected, impolite peer ignoring offer')
                return
            }
        }
        
        if (!peerConnection) {
            peerConnection = await createPeerConnection(from, false)
        }
        
        if (!peerConnection) return

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await peerConnection.createAnswer()
            await peerConnection.setLocalDescription(answer)
            
            sendSignalingMessage({
                type: 'answer',
                from: myUserIdRef.current,
                to: from,
                data: answer
            })
        } catch (error) {
            console.error('Error handling offer:', error)
        }
    }

    const handleAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
        console.log('Handling answer from:', from)
        const peerConnection = peerConnectionsRef.current.get(from)
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            } catch (error) {
                console.error('Error handling answer:', error)
            }
        }
    }

    const handleIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
        console.log('Handling ICE candidate from:', from)
        const peerConnection = peerConnectionsRef.current.get(from)
        
        if (peerConnection) {
            try {
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                } else {
                    // Store candidate for later
                    if (!pendingCandidatesRef.current.has(from)) {
                        pendingCandidatesRef.current.set(from, [])
                    }
                    pendingCandidatesRef.current.get(from)!.push(candidate)
                }
            } catch (error) {
                console.error('Error adding ICE candidate:', error)
            }
        }
    }

    const handleUserLeft = (userId: string) => {
        console.log('User left:', userId)
        const peerConnection = peerConnectionsRef.current.get(userId)
        if (peerConnection) {
            peerConnection.close()
            peerConnectionsRef.current.delete(userId)
        }
        
        makingOfferRef.current.delete(userId)
        pendingCandidatesRef.current.delete(userId)
        
        setParticipants(prev => prev.filter(p => p.id !== userId))
    }

    const updateParticipantState = (userId: string, userName: string, videoEnabled: boolean, audioEnabled: boolean) => {
        setParticipants(prev => {
            const existing = prev.find(p => p.id === userId)
            if (existing) {
                return prev.map(p => p.id === userId ? {...p, videoEnabled, audioEnabled, name: userName} : p)
            } else {
                return [...prev, {id: userId, name: userName, videoEnabled, audioEnabled}]
            }
        })
    }

    const broadcastCallState = () => {
        sendSignalingMessage({
            type: 'call-state',
            from: myUserIdRef.current,
            userName: session?.user?.name || 'Anonymous',
            videoEnabled: isVideoEnabled,
            audioEnabled: isAudioEnabled
        })
    }

    // Initialize media and auto-join voice channel (Discord style)
    const initializeMediaAndJoin = async () => {
        try {
            setIsConnecting(true)
            // Start with audio only, video disabled by default (like Discord)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })
            
            // Mute audio by default (like Discord's muted on join)
            stream.getAudioTracks().forEach(track => {
                track.enabled = false
            })
            
            localStreamRef.current = stream
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }
            
            // Add local participant
            setParticipants([{
                id: 'local',
                name: session?.user?.name || 'You',
                stream,
                videoEnabled: false,
                audioEnabled: false
            }])
            
            // Announce joining
            sendSignalingMessage({
                type: 'user-joined',
                from: myUserIdRef.current,
                userName: session?.user?.name || 'Anonymous',
                videoEnabled: false,
                audioEnabled: false
            })
            
            setIsConnecting(false)
        } catch (error) {
            console.error('Error accessing media devices:', error)
            setIsConnecting(false)
            // Still join without media
            setParticipants([{
                id: 'local',
                name: session?.user?.name || 'You',
                videoEnabled: false,
                audioEnabled: false
            }])
            
            sendSignalingMessage({
                type: 'user-joined',
                from: myUserIdRef.current,
                userName: session?.user?.name || 'Anonymous',
                videoEnabled: false,
                audioEnabled: false
            })
        }
    }

    const toggleVideo = async () => {
        if (!localStreamRef.current) return

        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        
        if (!isVideoEnabled && !videoTrack) {
            // Need to get video stream for the first time
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ 
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                })
                const newVideoTrack = videoStream.getVideoTracks()[0]
                
                localStreamRef.current.addTrack(newVideoTrack)
                
                // Add to all peer connections and trigger renegotiation
                peerConnectionsRef.current.forEach((pc, userId) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                    if (sender && sender.track === null) {
                        // Replace null track
                        sender.replaceTrack(newVideoTrack)
                    } else if (!sender) {
                        // Add new track
                        pc.addTrack(newVideoTrack, localStreamRef.current!)
                    }
                })
                
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current
                }
                
                setIsVideoEnabled(true)
                
                // Update local participant
                setParticipants(prev => prev.map(p => 
                    p.id === 'local' ? {...p, videoEnabled: true, stream: localStreamRef.current!} : p
                ))
                
                broadcastCallState()
            } catch (error) {
                console.error('Error accessing camera:', error)
                alert('Could not access camera. Please check permissions.')
            }
        } else if (videoTrack) {
            // Toggle existing video track
            videoTrack.enabled = !videoTrack.enabled
            setIsVideoEnabled(videoTrack.enabled)
            
            // Update local participant
            setParticipants(prev => prev.map(p => 
                p.id === 'local' ? {...p, videoEnabled: videoTrack.enabled} : p
            ))
            
            broadcastCallState()
        }
    }

    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setIsAudioEnabled(audioTrack.enabled)
                
                // Update local participant
                setParticipants(prev => prev.map(p => 
                    p.id === 'local' ? {...p, audioEnabled: audioTrack.enabled} : p
                ))
                
                broadcastCallState()
            }
        }
    }

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                })
                
                screenStreamRef.current = screenStream
                
                // Replace video track in all peer connections
                const videoTrack = screenStream.getVideoTracks()[0]
                peerConnectionsRef.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                    if (sender) {
                        sender.replaceTrack(videoTrack)
                    } else {
                        // If no video sender, add the screen share track
                        pc.addTrack(videoTrack, screenStream)
                    }
                })
                
                // Update local video
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream
                }
                
                setIsScreenSharing(true)
                
                // Handle screen share stop
                videoTrack.onended = () => {
                    stopScreenShare()
                }
                
            } catch (error) {
                console.error('Error sharing screen:', error)
            }
        } else {
            stopScreenShare()
        }
    }

    const stopScreenShare = () => {
        // Stop screen sharing
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop())
            screenStreamRef.current = null
        }
        
        // Restore camera or null track
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0]
            peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                if (sender) {
                    sender.replaceTrack(videoTrack || null)
                }
            })
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current
            }
        }
        
        setIsScreenSharing(false)
    }

    const handleAddElement = (element: elementSchema) => {
        yElementsRef.current?.push([element]); 
    }

    const handleMouseDown = (e: any) => {
        switch(selectedTool) {
            case 'pencil': {
                isPencilDrawing.current = true; 
                const point = e.target.getStage().getPointerPosition()
                const elementId = `${myUserIdRef.current}-${Date.now()}`
                const props = {id: elementId, points: [Number(point.x), Number(point.y)]}
                handleAddElement({tool: selectedTool, props})
                break; 
            } 
            case 'eraser': {
                isPencilDrawing.current = true; 
                const point = e.target.getStage().getPointerPosition()
                const elementId = `${myUserIdRef.current}-${Date.now()}`
                const props = {id: elementId, points: [point.x, point.y]}
                handleAddElement({tool: selectedTool, props})
                break; 
            } 
            case 'rectangle': {
                const point = e.target.getStage().getPointerPosition();
                const elementId = `${myUserIdRef.current}-${Date.now()}`
                const props = {id: elementId, x: point.x, y: point.y, width: 0, height: 0, stroke: 'black' }; 
                isShapeDrawing.current = true; 
                handleAddElement({tool: selectedTool, props}); 
                break;
            } 
            case 'circle': {
                const point = e.target.getStage().getPointerPosition(); 
                const elementId = `${myUserIdRef.current}-${Date.now()}`
                const props = {id: elementId, x: point.x, y: point.y, radius: 0, stroke: 'black'}
                isShapeDrawing.current = true; 
                handleAddElement({tool: selectedTool, props})
                break;
            }
            case 'arrow': {
                const point = e.target.getStage().getPointerPosition(); 
                const elementId= `${myUserIdRef.current}-${Date.now()}`; 
                const props = { id: elementId, x: point.x / 20, y: point.y / 20, points: [point.x, point.y, point.x, point.y],       
                    stroke: 'black',
                    fill: 'black', 
                    strokeWidth: 10,
                pointerLength: 15,
                pointerWidth: 15, }
                isShapeDrawing.current = true; 

                console.log("arrow props:", props)

                handleAddElement({tool: selectedTool, props}); 
                
                break; 
            }
        }   
    }

    const handleMouseMove = (e: any) => {
        const yElements = yElementsRef.current
        if (!yElements) return

        switch(selectedTool) {
            case 'pencil': {
                if (!isPencilDrawing.current) return; 
                const stage = e.target.getStage(); 
                const point = stage.getPointerPosition(); 

                let lastIndex = -1; 
                for (let i = yElements.length - 1; i >= 0; i--) {
                    if (yElements.get(i).tool === 'pencil' && 
                        yElements.get(i).props.id.startsWith(myUserIdRef.current)) {
                        lastIndex = i;
                        break;
                    }
                }

                if (lastIndex === -1) return;

                let lastLine = yElements.get(lastIndex); 
                const updatedLinePoints = {
                    ...lastLine.props,
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

                let lastIndex = -1; 
                for (let i = yElements.length - 1; i >= 0; i--) {
                    if (yElements.get(i).tool === 'eraser' && 
                        yElements.get(i).props.id.startsWith(myUserIdRef.current)) {
                        lastIndex = i;
                        break;
                    }
                }

                if (lastIndex === -1) return;

                let lastLine = yElements.get(lastIndex); 
                const updatedLinePoints = {
                    ...lastLine.props,
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

                let lastIndex = -1; 
                for (let i = yElements.length - 1; i >= 0; i--) {
                    if (yElements.get(i).tool === 'rectangle' && 
                        yElements.get(i).props.id.startsWith(myUserIdRef.current)) {
                        lastIndex = i;
                        break;
                    }
                }

                if (lastIndex === -1) return;

                let element = yElements.get(lastIndex); 
                const newWidth = pointer.x - element.props.x; 
                const newHeight = pointer.y - element.props.y; 
                
                const updatedElement = {
                    ...element,
                    props: {
                        ...element.props,
                        width: newWidth,
                        height: newHeight
                    }
                }

                yElements.doc?.transact(() => {
                    yElements.delete(lastIndex); 
                    yElements.insert(lastIndex, [updatedElement]); 
                })
                break; 
            }
            case 'circle': {
                if (!isShapeDrawing.current) return; 
                const pointer = e.target.getStage().getPointerPosition(); 

                let lastIndex = -1; 
                for (let i = yElements.length - 1; i >= 0; i--) {
                    if (yElements.get(i).tool === 'circle' && 
                        yElements.get(i).props.id.startsWith(myUserIdRef.current)) {
                        lastIndex = i;
                        break;
                    }
                }

                if (lastIndex === -1) return;

                let element = yElements.get(lastIndex); 
                
                const dx = pointer.x - element.props.x;
                const dy = pointer.y - element.props.y;
                const newRadius = Math.round(Math.sqrt(dx * dx + dy * dy));

                const updatedElement = {
                    ...element,
                    props: {
                        ...element.props,
                        radius: newRadius
                    }
                }

                yElements.doc?.transact(() => {
                    yElements.delete(lastIndex); 
                    yElements.insert(lastIndex, [updatedElement])
                })
                break; 
            }
            case 'arrow': {
                if (!isShapeDrawing.current) return; 

                const pointer = e.target.getStage().getPointerPosition(); 

                let lastIndex = -1; 
                for (let i = yElements.length - 1; i >= 0; i--) {
                    if (yElements.get(i).tool === 'arrow' && 
                        yElements.get(i).props.id.startsWith(myUserIdRef.current)) {
                        lastIndex = i;
                        break;
                    }
                }

                if (lastIndex === -1) return;

                let lastArrow = yElements.get(lastIndex); 
                console.log(lastArrow.props.points[0])
                const updateElement = {
                    ...lastArrow, 
                    props: {
                        ...lastArrow.props, 
                        points: [lastArrow.props.points[0], lastArrow.props.points[1], pointer.x, pointer.y]
                    }
                }

                console.log(updateElement)
                yElements.doc?.transact(() => {
                    yElements.delete(lastIndex); 
                    yElements.insert(lastIndex, [updateElement])
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
                const yElements = yElementsRef.current
                if (yElements) {
                    yElements.delete(0, yElements.length)
                }
                
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
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-xl font-semibold text-gray-700">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-screen overflow-hidden bg-gray-50">
            {/* Header */}

            {isTextElementVisible && <TextElement value={textElemValue} valueRef={textToSend} setValue={setTextElemValue} stageRef={stageRef} isVisible={isTextElementVisible} />}
            <div className={`absolute ${isTextElementVisible ? "ml-95" : "ml-0"} transition-all duration-100 ease-linear top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm shadow-md`}>
                <div className="flex justify-between items-center px-6 py-3">
                    {/* Room Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 ">
                            <button onClick={() => {setIsTextElementVisible(prev => !prev)}} className='w-10 h-10 hover:bg-gray-100/50 flex items-center justify-center'>
                                <RiArchiveDrawerFill />
                            </button>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {roomInfo?.name || 'Untitled Whiteboard'}
                            </h2>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
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
                        
                        {/* Share Link */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2">
                            <input
                                type="text"
                                value={`${window.location.origin}/home/${roomId}`}
                                readOnly
                                className="w-64 bg-transparent text-xs text-gray-700 font-mono outline-none"
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={copyRoomLink}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium text-xs transition-all ${
                                    copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {copied ? <MdCheck size={14} /> : <MdCopyAll size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </motion.button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <Toolbar />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClearCanvas}
                            className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Clear Canvas
                        </button>
                        <button
                            onClick={() => router.push('/home/dashboard')}
                            className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Dashboard
                        </button>
                    </div>
                </div>
            </div>

            {/* Voice Channel Panel - Discord Style */}
            <AnimatePresence>
                {showParticipants && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="absolute top-20 right-4 z-30 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex justify-between items-center">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Voice Channel ({participants.length})
                            </h3>
                            <button
                                onClick={() => setShowParticipants(false)}
                                className="text-white hover:bg-white/20 rounded-lg px-2 py-1 text-sm transition-colors"
                            >
                                Hide
                            </button>
                        </div>
                        
                        {isConnecting ? (
                            <div className="p-8 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-600 text-sm">Joining voice channel...</p>
                            </div>
                        ) : (
                            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                                {participants.map((participant) => (
                                    <div key={participant.id} className="relative">
                                        <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
                                            {participant.id === 'local' ? (
                                                <video
                                                    ref={localVideoRef}
                                                    autoPlay
                                                    muted
                                                    playsInline
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    autoPlay
                                                    playsInline
                                                    className="w-full h-full object-cover"
                                                    ref={(el) => {
                                                        if (el && participant.stream) {
                                                            el.srcObject = participant.stream
                                                        }
                                                    }}
                                                />
                                            )}
                                            
                                            {!participant.videoEnabled && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600">
                                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                                        {participant.name.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                                <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
                                                    {participant.name}
                                                </span>
                                                <div className="flex gap-1">
                                                    {!participant.audioEnabled && (
                                                        <div className="bg-red-500 p-1 rounded-full">
                                                            <MdMicOff className="text-white" size={16} />
                                                        </div>
                                                    )}
                                                    {participant.videoEnabled && (
                                                        <div className="bg-green-500 p-1 rounded-full">
                                                            <MdVideocam className="text-white" size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Controls - Discord Style (Always visible) */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
            >
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl px-6 py-4">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleVideo}
                            disabled={isConnecting}
                            className={`p-4 rounded-xl transition-all ${
                                isVideoEnabled
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {isVideoEnabled ? <MdVideocam size={24} /> : <MdVideocamOff size={24} />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleAudio}
                            disabled={isConnecting}
                            className={`p-4 rounded-xl transition-all ${
                                isAudioEnabled
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                        >
                            {isAudioEnabled ? <MdMic size={24} /> : <MdMicOff size={24} />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleScreenShare}
                            disabled={isConnecting}
                            className={`p-4 rounded-xl transition-all ${
                                isScreenSharing
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                        >
                            {isScreenSharing ? <MdStopScreenShare size={24} /> : <MdScreenShare size={24} />}
                        </motion.button>

                        {!showParticipants && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowParticipants(true)}
                                className="p-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all"
                                title="Show participants"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{participants.length}</span>
                                    <MdVideocam size={20} />
                                </div>
                            </motion.button>
                        )}

                        <div className="text-sm text-gray-600 ml-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {isConnecting ? 'Connecting...' : 'Connected'}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Canvas */}
            <div className={`pt-20 ${isTextElementVisible ? "ml-40" : "ml-0"} transition-all duration-100 ease-linear`}>
                <Stage 
                    onMouseUp={handleMouseUp} 
                    onMouseMove={handleMouseMove} 
                    onMouseDown={handleMouseDown} 
                    width={dimensions.width} 
                    height={dimensions.height}
                    
                    ref={stageRef}
                >
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
                                case 'arrow': {
                                    return <Arrow 
                                    key={i}
                                    id={item.props.id}
                                    x={item.props.x}
                                    y={item.props.y}
                                    stroke={item.props.stroke}
                                    pointerWidth={item.props.pointerWidth}
                                    pointerLength={item.props.pointerLength}
                                    points={item.props.points}
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