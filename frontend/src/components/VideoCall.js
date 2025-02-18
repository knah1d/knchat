import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import { 
  Close as CloseIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon
} from '@mui/icons-material';
import Peer from 'peerjs';

const VideoCall = ({ username, open, onClose }) => {
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remotePeerIdToCall, setRemotePeerIdToCall] = useState('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [connectionState, setConnectionState] = useState('disconnected');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [isRemoteVideoReady, setIsRemoteVideoReady] = useState(false);

  useEffect(() => {
    if (open) {
      // Generate a random peer ID with username prefix
      const randomId = Math.random().toString(36).substring(7);
      const uniquePeerId = `${username}_${randomId}`;

      const newPeer = new Peer(uniquePeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10
        },
        debug: 3,
        host: '0.peerjs.com',
        secure: true,
        port: 443,
        path: '/',
        pingInterval: 3000,
        retryTimer: 1000
      });

      setPeer(newPeer);

      newPeer.on('open', (id) => {
        console.log('Successfully connected to PeerJS server. My peer ID is:', id);
        setPeerId(id);
        setConnectionState('connected');
        startLocalVideo();
      });

      // Add ICE connection monitoring
      const monitorIceConnection = (call) => {
        call.peerConnection.oniceconnectionstatechange = () => {
          const state = call.peerConnection.iceConnectionState;
          console.log('ICE Connection State:', state);
          setIceConnectionState(state);
          
          if (state === 'failed') {
            console.log('ICE Connection failed. Attempting to restart ICE...');
            try {
              call.peerConnection.restartIce();
            } catch (err) {
              console.error('Failed to restart ICE:', err);
            }
          }
        };

        // Monitor ICE candidate gathering
        call.peerConnection.onicegatheringstatechange = () => {
          console.log('ICE gathering state:', call.peerConnection.iceGatheringState);
        };
      };

      newPeer.on('call', async (call) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          call.answer(stream);
          
          monitorIceConnection(call);
          call.on('stream', (remoteVideoStream) => {
            console.log('Received remote stream:', {
              id: remoteVideoStream.id,
              active: remoteVideoStream.active
            });
            
            setRemoteStream(remoteVideoStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteVideoStream;
            }
          });
        } catch (err) {
          console.error('Error answering call:', err);
        }
      });

      newPeer.on('disconnected', () => {
        console.log('Connection to PeerJS server lost. Attempting to reconnect...');
        setConnectionState('reconnecting');
        
        const reconnectAttempt = async () => {
          try {
            if (newPeer && newPeer.disconnected) {
              console.log('Attempting to reconnect to PeerJS server...');
              await newPeer.reconnect();
            }
          } catch (err) {
            console.error('Reconnection attempt failed:', err);
            // Try again after delay
            setTimeout(reconnectAttempt, 3000);
          }
        };

        reconnectAttempt();
      });

      newPeer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'peer-unavailable') {
          console.log('Peer is not available. They may be offline or behind a restrictive firewall.');
        } else if (err.type === 'network') {
          console.log('Network error occurred. Checking connection...');
          setConnectionState('checking');
          // Attempt to reconnect after network error
          setTimeout(() => {
            if (newPeer && newPeer.disconnected) {
              newPeer.reconnect();
            }
          }, 3000);
        } else if (err.type === 'disconnected') {
          console.log('Connection to signaling server lost. Attempting to reconnect...');
          setConnectionState('reconnecting');
          setTimeout(() => {
            if (newPeer && newPeer.disconnected) {
              newPeer.reconnect();
            }
          }, 3000);
        } else if (err.type === 'server-error') {
          console.log('PeerJS server error. Attempting to reconnect to a different server...');
          setConnectionState('switching_server');
          // Destroy current peer and create new one with fallback server
          newPeer.destroy();
          const fallbackPeer = new Peer(uniquePeerId, {
            ...newPeer.options,
            host: 'peer.metered.live',
            path: '/peerjs',
          });
          setPeer(fallbackPeer);
        }
      });

      return () => {
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => track.stop());
        }
        newPeer.destroy();
      };
    }
  }, [open, username]);

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to get local stream:', err);
    }
  };

  const handleRemoteStream = (remoteVideoStream) => {
    console.log('Received remote stream:', {
      id: remoteVideoStream.id,
      active: remoteVideoStream.active,
      tracks: remoteVideoStream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      }))
    });

    // Ensure all tracks are enabled and handle track events
    remoteVideoStream.getTracks().forEach(track => {
      track.enabled = true;
      
      track.onended = () => {
        console.log(`${track.kind} track ended`);
        if (track.kind === 'video') {
          setIsRemoteVideoReady(false);
        }
      };
      
      track.onmute = () => {
        console.log(`${track.kind} track muted`);
        track.enabled = true; // Try to re-enable
      };
      
      track.onunmute = () => {
        console.log(`${track.kind} track unmuted`);
        track.enabled = true;
      };

      console.log(`${track.kind} track:`, {
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      });
    });

    setRemoteStream(remoteVideoStream);
  };

  const callUser = async () => {
    if (!remotePeerIdToCall.trim() || !peer || !localStream) return;

    try {
      console.log('Calling peer:', remotePeerIdToCall);
      const call = peer.call(remotePeerIdToCall, localStream);
      
      monitorIceConnection(call);
      call.on('stream', (remoteVideoStream) => {
        console.log('Received remote stream:', {
          id: remoteVideoStream.id,
          active: remoteVideoStream.active
        });
        
        setRemoteStream(remoteVideoStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteVideoStream;
        }
      });

      call.on('error', (err) => {
        console.error('Call error:', err);
      });

      call.on('close', () => {
        console.log('Call closed');
        setRemoteStream(null);
      });
    } catch (err) {
      console.error('Failed to call user:', err);
    }
  };

  const handleClose = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    setRemotePeerIdToCall('');
    onClose();
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Add useEffect to handle remote stream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting up remote stream:', {
        id: remoteStream.id,
        active: remoteStream.active,
        tracks: remoteStream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });

      const videoTrack = remoteStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('Remote video track ended');
          setIsRemoteVideoReady(false);
        };
        videoTrack.onmute = () => console.log('Remote video track muted');
        videoTrack.onunmute = () => console.log('Remote video track unmuted');
      }

      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.onloadedmetadata = () => {
        console.log('Remote video metadata loaded, attempting to play');
        remoteVideoRef.current.play()
          .then(() => {
            console.log('Remote video playing successfully');
            setIsRemoteVideoReady(true);
          })
          .catch(err => {
            console.error('Failed to play remote video:', err);
            setIsRemoteVideoReady(false);
          });
      };
    }
  }, [remoteStream]);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Video Call
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Your ID: {peerId} 
            {connectionState !== 'connected' && (
              <Typography 
                component="span" 
                color="error" 
                sx={{ ml: 1 }}
              >
                ({connectionState === 'reconnecting' ? 'Reconnecting...' : 
                  connectionState === 'checking' ? 'Checking connection...' :
                  connectionState === 'switching_server' ? 'Switching servers...' : 
                  'Disconnected'})
              </Typography>
            )}
            {iceConnectionState !== 'connected' && iceConnectionState !== 'new' && (
              <Typography 
                component="span" 
                color={iceConnectionState === 'checking' ? 'primary' : 'error'}
                sx={{ ml: 1 }}
              >
                (Connection: {iceConnectionState})
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter Peer ID to call"
              value={remotePeerIdToCall}
              onChange={(e) => setRemotePeerIdToCall(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={callUser}
              disabled={!remotePeerIdToCall.trim() || !localStream}
            >
              Call
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ width: '50%', position: 'relative' }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ 
                width: '100%', 
                borderRadius: '8px', 
                backgroundColor: '#1a1a1a',
                display: isVideoEnabled ? 'block' : 'none'
              }}
            />
            {!isVideoEnabled && (
              <Box sx={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '8px', 
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '16/9'
              }}>
                <Typography variant="body1" color="white">
                  Camera Off
                </Typography>
              </Box>
            )}
            <Box sx={{ 
              position: 'absolute', 
              bottom: 8, 
              left: 0, 
              right: 0,
              px: 2,
              display: 'flex',
              justifyContent: 'center',
              gap: 1
            }}>
              <IconButton 
                size="small"
                onClick={toggleVideo}
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
              >
                {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
              <IconButton
                size="small"
                onClick={toggleAudio}
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
              >
                {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              top: 8, 
              left: 8, 
              color: 'white', 
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              bgcolor: 'rgba(0,0,0,0.4)',
              px: 1,
              py: 0.5,
              borderRadius: 1
            }}>
              You
            </Box>
          </Box>
          <Box sx={{ width: '50%', position: 'relative' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ 
                width: '100%', 
                borderRadius: '8px', 
                backgroundColor: '#1a1a1a'
              }}
            />
            {!remoteStream && (
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                aspectRatio: '16/9'
              }}>
                <Typography color="text.secondary">
                  Waiting for connection...
                </Typography>
              </Box>
            )}
            <Box sx={{ 
              position: 'absolute', 
              top: 8, 
              left: 8, 
              color: 'white', 
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              bgcolor: 'rgba(0,0,0,0.4)',
              px: 1,
              py: 0.5,
              borderRadius: 1
            }}>
              {remoteStream ? 'Remote User' : 'Waiting for connection...'}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCall; 