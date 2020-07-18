# Joining
Client wants to join a room:
 - Fetch timeline from client (measure client -> plex client latency too)

Client sends join:
 - room
 - password
 - desiredUsername
 - thumb
 - desiredPartyPausingEnabled
 - timeline
 - plexClientLatency


- Server validates room password, creates room if needed, and adds user to room
- Send out user-joined message to everyone else in room
User is now in NeedRTT state
 - user can't be made host since we don't know user state

- Server sends out ping, client responds immediately with pong (calculate rtt)
User is now in UnknownPlayerState state since we don't know their player state
 - They still can't be made host if not already

Client: after sending back pong, fetch fresh timeline and send entire state to server
Server: after receiving pong, should send user state of all other users (and party pause etc)
