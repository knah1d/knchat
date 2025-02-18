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
        
        // Clear any existing streams
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }

        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: true
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('Got media stream:', mediaStream.getTracks());

        // Set up video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
          
          // Force a play attempt
          try {
            await localVideoRef.current.play();
            console.log('Local video playing');
          } catch (playError) {
            console.warn('Auto-play failed:', playError);
          }
        }

        setLocalStream(mediaStream);
        setIsVideoEnabled(true);
        setIsVideoInitialized(true);

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
    if (!open || !socket || !isVideoInitialized) return;

    let mounted = true;
    console.log('Initializing peer connection...');

    const initializePeer = async () => {
      try {
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
          pingInterval: 3000
        });

        peerRef.current = newPeer;

        newPeer.on('open', (id) => {
          if (!mounted) return;
          console.log('PeerJS: Connected with ID:', id);
          setPeerId(id);
          setPeer(newPeer);
          socket.emit('user_joined_video', { username, peerId: id });
          setIsInitializing(false);
        });

        newPeer.on('error', (err) => {
          console.error('PeerJS error:', err);
          if (!mounted) return;
          setNotification({
            open: true,
            message: 'Connection error occurred. Please try again.',
            severity: 'error'
          });
          setIsInitializing(false);
        });

        newPeer.on('call', (call) => {
          if (!mounted) return;
          const callerUsername = call.metadata?.username;
          setIncomingCall({ call, username: callerUsername });
        });

      } catch (err) {
        console.error('Peer initialization failed:', err);
        if (mounted) {
          setNotification({
            open: true,
            message: 'Failed to initialize video call connection',
            severity: 'error'
          });
          setIsInitializing(false);
        }
      }
    };

    initializePeer();

    return () => {
      mounted = false;
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [open, socket, isVideoInitialized, username]);

  const startLocalVideo = async () => {
    try {
      console.log('Starting local video...');
      
      // Stop any existing streams first
      if (localStream) {
        console.log('Stopping existing stream');
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      console.log('Requesting media stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('Got stream with tracks:', stream.getTracks());

      // Set stream to state first
      setLocalStream(stream);
      setIsVideoEnabled(true);

      // Then set up video element
      if (localVideoRef.current) {
        console.log('Setting up video element');
        localVideoRef.current.srcObject = stream;
        
        // Important: wait for metadata before playing
        localVideoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting to play');
          localVideoRef.current.play()
            .then(() => console.log('Video playing'))
            .catch(err => {
              console.error('Play failed:', err);
              // Add a visible play button
              setNotification({
                open: true,
                message: 'Click the video area to start camera',
                severity: 'info'
              });
            });
        };
      } else {
        console.error('No video element reference');
      }

    } catch (err) {
      console.error('Failed to start video:', err);
      setNotification({
        open: true,
        message: err.name === 'NotAllowedError' 
          ? 'Camera access was denied. Please allow camera access and try again.'
          : 'Failed to start camera. Please check your device settings.',
        severity: 'error'
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
    call.on('stream', (remoteVideoStream) => {
      setRemoteStream(remoteVideoStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteVideoStream;
      }
    });

    call.on('close', () => {
      setRemoteStream(null);
      setCurrentCall(null);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      setNotification({
        open: true,
        message: 'Call error occurred',
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
            !currentCall && !incomingCall ? (
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
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={async () => {
                    if (localVideoRef.current && localVideoRef.current.paused) {
                      try {
                        await localVideoRef.current.play();
                        console.log('Video started on click');
                      } catch (err) {
                        console.error('Play failed on click:', err);
                        setNotification({
                          open: true,
                          message: 'Failed to start video. Please try again.',
                          severity: 'error'
                        });
                      }
                    }
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
                      display: isVideoEnabled ? 'block' : 'none'
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
                      backgroundColor: '#1a1a1a'
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
              </Box>
            ) : (
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
                      onClick={() => {
                        const videoTrack = localStream.getVideoTracks()[0];
                        if (videoTrack) {
                          videoTrack.enabled = !videoTrack.enabled;
                          setIsVideoEnabled(videoTrack.enabled);
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
                        const audioTrack = localStream.getAudioTracks()[0];
                        if (audioTrack) {
                          audioTrack.enabled = !audioTrack.enabled;
                          setIsAudioEnabled(audioTrack.enabled);
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