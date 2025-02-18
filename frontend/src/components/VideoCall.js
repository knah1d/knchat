import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Close as CloseIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon
} from '@mui/icons-material';
import Peer from 'peerjs';

const VideoCall = ({ username, open, onClose, socket }) => {
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [activeUsers, setActiveUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVideoInitialized, setIsVideoInitialized] = useState(false);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!socket || !open) return;

    console.log('Setting up video call socket listeners for:', username);

    // Immediately emit user joined when component opens
    socket.emit('user_joined_video', { username, peerId });

    // Set up socket event listeners
    const handleActiveUsers = (users) => {
      console.log('Received active users:', users);
      // Filter out current user and ensure we're getting an array
      const otherUsers = Array.isArray(users) ? users.filter(user => user.username !== username) : [];
      console.log('Filtered active users:', otherUsers);
      setActiveUsers(otherUsers);
    };

    socket.on('active_video_users', handleActiveUsers);

    // Clean up function
    return () => {
      console.log('Cleaning up video call socket listeners');
      socket.off('active_video_users', handleActiveUsers);
      socket.emit('user_left_video', { username, peerId });
    };
  }, [socket, open, username, peerId]);

  useEffect(() => {
    let mounted = true;

    const initVideo = async () => {
      if (!open) return;

      try {
        console.log('Initializing video...');
        setIsInitializing(true);
        
        // Clear any existing streams
        if (localStream) {
          console.log('Stopping existing stream');
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }

        // Reset video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }

        // Request camera access with specific constraints
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            aspectRatio: 16/9,
            facingMode: 'user'
          },
          audio: true
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('Got media stream:', mediaStream.getTracks());

        // Ensure video track is enabled
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          console.log('Video track:', videoTrack.label, 'enabled:', videoTrack.enabled);
        }

        // Set stream to state
        setLocalStream(mediaStream);
        setIsVideoEnabled(true);

        // Set up video element
        if (localVideoRef.current) {
          console.log('Setting up video element');
          localVideoRef.current.srcObject = mediaStream;
          localVideoRef.current.muted = true; // Important: mute local video
          
          // Add all event listeners for debugging
          localVideoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            debugVideoElement();
          };
          
          localVideoRef.current.oncanplay = () => {
            console.log('Video can play');
            debugVideoElement();
            localVideoRef.current.play()
              .then(() => console.log('Video playing'))
              .catch(err => console.warn('Autoplay prevented:', err));
          };

          localVideoRef.current.onerror = (error) => {
            console.error('Video element error:', error);
          };

          // Force play attempt
          try {
            await localVideoRef.current.play();
            console.log('Initial play successful');
          } catch (err) {
            console.warn('Initial play failed, waiting for user interaction:', err);
          }
        }

        setIsVideoInitialized(true);
        setIsInitializing(false);

      } catch (err) {
        console.error('Video initialization failed:', err);
        if (mounted) {
          setNotification({
            open: true,
            message: err.name === 'NotAllowedError' 
              ? 'Please allow camera access to use video calls'
              : 'Failed to start camera. Please check your device settings.',
            severity: 'error'
          });
          setIsInitializing(false);
        }
      }
    };

    initVideo();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  useEffect(() => {
    if (!localVideoRef.current || !localStream) return;

    const videoElement = localVideoRef.current;
    videoElement.srcObject = localStream;
    videoElement.muted = true;

    const playVideo = async () => {
      try {
        await videoElement.play();
        console.log('Video playing successfully');
      } catch (err) {
        console.error('Failed to play video:', err);
      }
    };

    videoElement.onloadedmetadata = () => {
      console.log('Video metadata loaded');
      playVideo();
    };

    // Try to play immediately as well
    playVideo();

    return () => {
      videoElement.srcObject = null;
      videoElement.onloadedmetadata = null;
    };
  }, [localStream]);

  const getXirsysIceServers = async () => {
    try {
      const response = await fetch('https://global.xirsys.net/_turn/knchat', {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa.from('knah1d:7fd3cb54-edfd-11ef-a4fe-0242ac130003').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'urls',
          expire: '5'
        })
      });

      const data = await response.json();
      console.log('Xirsys ICE servers:', data.v.iceServers);
      return data.v.iceServers;
    } catch (error) {
      console.error('Failed to get Xirsys ICE servers:', error);
      // Fallback to free STUN/TURN servers if Xirsys fails
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: [
            'turn:a.relay.metered.ca:80',
            'turn:a.relay.metered.ca:80?transport=tcp',
            'turn:a.relay.metered.ca:443',
            'turn:a.relay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ];
    }
  };

  useEffect(() => {
    if (!open || !socket || !isVideoInitialized) return;

    let mounted = true;
    console.log('Initializing peer connection...');

    const initializePeer = async () => {
      try {
        setIsConnecting(true);
        const iceServers = await getXirsysIceServers();
        const randomId = Math.random().toString(36).substring(7);
        const uniquePeerId = `${username}_${randomId}`;

        const newPeer = new Peer(uniquePeerId, {
          debug: 3,
          host: 'peerjs.knchat.onrender.com',
          secure: true,
          port: 443,
          path: '/',
          pingInterval: 3000,
          config: {
            iceServers,
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan'
          }
        });

        peerRef.current = newPeer;

        // Enhanced connection monitoring
        newPeer.on('iceStateChanged', (state) => {
          console.log('ICE connection state changed:', state);
          setIceConnectionState(state);
          
          if (state === 'failed') {
            console.log('ICE connection failed, attempting to restart ICE');
            if (currentCall) {
              currentCall.peerConnection.restartIce();
            }
          }
        });

        newPeer.on('open', (id) => {
          if (!mounted) return;
          console.log('PeerJS: Connected with ID:', id);
          setPeerId(id);
          setPeer(newPeer);
          socket.emit('user_joined_video', { username, peerId: id });
          setIsInitializing(false);
          setIsConnecting(false);
        });

        newPeer.on('error', (err) => {
          console.error('PeerJS error:', err);
          if (!mounted) return;
          
          let errorMessage = 'Connection error occurred. ';
          if (err.type === 'network') {
            errorMessage += 'Please check your internet connection.';
          } else if (err.type === 'disconnected') {
            errorMessage += 'Connection to the server was lost. Attempting to reconnect...';
            // Attempt to reconnect
            setTimeout(() => {
              if (mounted) initializePeer();
            }, 3000);
          } else if (err.type === 'server-error') {
            errorMessage += 'Unable to reach the signaling server. Please try again later.';
          } else if (err.type === 'peer-unavailable') {
            errorMessage += 'The other user is not available or may have left the call.';
          } else if (err.type === 'webrtc') {
            errorMessage += 'WebRTC connection failed. This might be due to network restrictions.';
          }
          
          setNotification({
            open: true,
            message: errorMessage,
            severity: 'error'
          });
          setIsConnecting(false);
          setIsInitializing(false);
        });

        // Enhanced call handling
        newPeer.on('call', (call) => {
          if (!mounted) return;
          console.log('Incoming call from:', call.metadata?.username);
          
          // Monitor the peer connection
          const pc = call.peerConnection;
          pc.oniceconnectionstatechange = () => {
            console.log('ICE Connection State:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
              console.log('Attempting to restart ICE connection');
              pc.restartIce();
            }
          };

          pc.onconnectionstatechange = () => {
            console.log('Connection State:', pc.connectionState);
          };

          setIncomingCall({ call, username: call.metadata?.username });
        });

      } catch (err) {
        console.error('Peer initialization failed:', err);
        if (mounted) {
          setNotification({
            open: true,
            message: 'Failed to initialize video call connection. Please try again.',
            severity: 'error'
          });
          setIsInitializing(false);
          setIsConnecting(false);
        }
      }
    };

    initializePeer();

    return () => {
      mounted = false;
      if (peerRef.current) {
        console.log('Destroying peer connection');
        peerRef.current.destroy();
      }
    };
  }, [open, socket, isVideoInitialized, username, currentCall]);

  const debugVideoElement = () => {
    if (localVideoRef.current) {
      console.log('Video element state:', {
        readyState: localVideoRef.current.readyState,
        paused: localVideoRef.current.paused,
        currentSrc: localVideoRef.current.currentSrc,
        videoWidth: localVideoRef.current.videoWidth,
        videoHeight: localVideoRef.current.videoHeight,
        srcObject: localVideoRef.current.srcObject ? 'present' : 'null'
      });
    }
  };

  const initiateCall = async (userToCall) => {
    if (!peer || !localStream) return;

    try {
      const call = peer.call(userToCall.peerId, localStream, {
        metadata: { username }
      });
      
      setCurrentCall(call);
      handleCallConnection(call);
      
      socket.emit('video_call_initiated', {
        from: username,
        to: userToCall.username
      });
    } catch (err) {
      console.error('Failed to call user:', err);
      setNotification({
        open: true,
        message: 'Failed to initiate call',
        severity: 'error'
      });
    }
  };

  const handleCallConnection = (call) => {
    // Monitor the peer connection
    const pc = call.peerConnection;
    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.log('Attempting to restart ICE connection');
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection State:', pc.connectionState);
    };

    call.on('stream', (remoteVideoStream) => {
      console.log('Received remote stream');
      setRemoteStream(remoteVideoStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteVideoStream;
      }
    });

    call.on('close', () => {
      console.log('Call closed');
      setRemoteStream(null);
      setCurrentCall(null);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      setNotification({
        open: true,
        message: 'Call error occurred. The connection may be unstable.',
        severity: 'error'
      });
    });
  };

  const acceptCall = async () => {
    if (!incomingCall || !localStream) return;

    try {
      incomingCall.call.answer(localStream);
      setCurrentCall(incomingCall.call);
      handleCallConnection(incomingCall.call);
      setIncomingCall(null);
    } catch (err) {
      console.error('Error accepting call:', err);
      setNotification({
        open: true,
        message: 'Failed to accept call',
        severity: 'error'
      });
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      incomingCall.call.close();
      setIncomingCall(null);
      socket.emit('video_call_rejected', {
        from: username,
        to: incomingCall.username
      });
    }
  };

  const endCall = () => {
    if (currentCall) {
      currentCall.close();
      setCurrentCall(null);
      setRemoteStream(null);
    }
  };

  return (
    <>
    <Dialog 
      open={open} 
        onClose={onClose}
      maxWidth="md"
      fullWidth
        TransitionProps={{
          onExited: () => {
            if (localStream) {
              localStream.getTracks().forEach(track => track.stop());
            }
            if (remoteStream) {
              remoteStream.getTracks().forEach(track => track.stop());
            }
            setLocalStream(null);
            setRemoteStream(null);
            setActiveUsers([]);
            if (peerRef.current) {
              peerRef.current.destroy();
            }
            socket.emit('user_left_video', { username, peerId });
          }
        }}
    >
      <DialogTitle>
        Video Call
        <IconButton
          aria-label="close"
            onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
          {isInitializing ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400
            }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>
                {!isVideoInitialized ? 'Setting up camera...' : 'Initializing connection...'}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Box 
                sx={{ 
                  width: '100%', 
                  maxWidth: 400, 
                  margin: '0 auto 20px auto',
                  position: 'relative',
                  aspectRatio: '16/9',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
            <video
              ref={localVideoRef}
              autoPlay
                  playsInline
              muted
              style={{ 
                width: '100%', 
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: 'block'
                  }}
                />
                
            {!isVideoEnabled && (
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
                    zIndex: 1
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
                  gap: 1,
                  zIndex: 2
            }}>
              <IconButton 
                size="small"
                    onClick={() => {
                      if (localStream) {
                        const videoTrack = localStream.getVideoTracks()[0];
                        if (videoTrack) {
                          videoTrack.enabled = !videoTrack.enabled;
                          setIsVideoEnabled(videoTrack.enabled);
                        }
                      }
                    }}
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
                    onClick={() => {
                      if (localStream) {
                        const audioTrack = localStream.getAudioTracks()[0];
                        if (audioTrack) {
                          audioTrack.enabled = !audioTrack.enabled;
                          setIsAudioEnabled(audioTrack.enabled);
                        }
                      }
                    }}
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
              >
                {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Box>
            </Box>
              {!currentCall && !incomingCall ? (
                <List>
                  {activeUsers.map((user) => (
                    <ListItem key={user.peerId}>
                      <ListItemText 
                        primary={user.username}
                        secondary="Online"
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          color="primary"
                          onClick={() => initiateCall(user)}
                        >
                          <CallIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {activeUsers.length === 0 && (
                    <Typography color="text.secondary" align="center">
                      No active users available
                    </Typography>
                  )}
                </List>
              ) : (
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ width: '100%', position: 'relative' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
                      muted={false}
                      controls
                      style={{ 
                        width: '100%', 
                        borderRadius: '8px', 
                        backgroundColor: '#1a1a1a',
                        display: remoteStream ? 'block' : 'none'
                      }}
                      onLoadedMetadata={(e) => {
                        console.log('Remote video metadata loaded');
                        e.target.play().catch(err => console.error('Play failed:', err));
                      }}
                      onPlay={() => console.log('Remote video playing')}
                      onError={(e) => console.error('Video error:', e)}
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
              )}
            </Box>
          )}
      </DialogContent>
        {incomingCall && (
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<VideocamIcon />}
              onClick={acceptCall}
            >
              Accept Call from {incomingCall.username}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<CallEndIcon />}
              onClick={rejectCall}
            >
              Reject
            </Button>
          </DialogActions>
        )}
        {currentCall && (
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<CallEndIcon />}
              onClick={endCall}
            >
              End Call
            </Button>
          </DialogActions>
        )}
    </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default VideoCall; 