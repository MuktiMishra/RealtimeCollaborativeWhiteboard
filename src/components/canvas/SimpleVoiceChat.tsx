'use client'

import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Mic, MicOff, Users, Copy, Check, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { Button } from '../ui/button';

export function SimpleVoiceChat({roomId}: {roomId: string}) {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [showVoice, setShowVoice] = useState(true); 
  
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connectionsRef = useRef<any[]>([]);

  useEffect(() => {
    const peer = new Peer(roomId);
    peerRef.current = peer;
      
    peer.on('open', (id) => {
      setPeerId(id);
      console.log('Your ID:', id);
    });

    // Handle incoming calls
    peer.on('call', (call) => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          streamRef.current = stream;
          call.answer(stream);
          
          call.on('stream', (remoteStream) => {
            playAudio(remoteStream);
          });

          setIsConnected(true);
          setConnectedPeers(prev => prev + 1);
        });
    });

    return () => {
      peer.destroy();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const playAudio = (stream: MediaStream) => {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play();
  };

  const connectToPeer = async () => {
    if (!remotePeerId.trim()) {
      alert('Enter a peer ID');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      streamRef.current = stream;
      const call = peerRef.current?.call(remotePeerId.trim(), stream);
      
      if (call) {
        call.on('stream', (remoteStream) => {
          playAudio(remoteStream);
        });
        
        setIsConnected(true);
        setConnectedPeers(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to connect. Make sure microphone permission is granted.');
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const copyPeerId = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute bottom-10 left-5 z-50">
     {showVoice ? <div>
      {!isConnected ? (
        <div className="bg-white p-4 rounded-lg shadow-lg w-80">
          <div className='flex items-center justify-between'>
            <h3 className="font-bold mb-3">Voice Chat</h3>
            <Button variant={'outline'} size='icon' onClick={() => {
              setShowVoice(prev => !prev); 
            }}><ArrowDownIcon /></Button>
          </div>
          
          <div className="mb-3">
            <label className="text-xs text-gray-600">Your ID (share this):</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={peerId}
                readOnly
                className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm"
              />
              <button
                onClick={copyPeerId}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-600">Connect to peer:</label>
            <input
              type="text"
              placeholder="Enter peer ID"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              className="w-full px-2 py-1 border rounded mt-1"
              onKeyPress={(e) => e.key === 'Enter' && connectToPeer()}
            />
          </div>

          <button
            onClick={connectToPeer}
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          >
            Connect
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg">
            <Users size={20} />
            <span>{connectedPeers + 1}</span>
          </div>
          
          <button
            onClick={toggleMute}
            className={`p-3 rounded-lg shadow-lg ${
              isMuted ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>
      )}</div> : <div className=''>
          <Button variant='outline' size='icon' onClick={() => setShowVoice(true)}><ArrowUpIcon /></Button>
        </div>}
    </div>
  );
}