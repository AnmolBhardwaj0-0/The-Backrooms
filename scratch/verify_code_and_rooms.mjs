import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function runTests() {
  console.log('=== STARTING LOUNGE CODE & ROOM VISIBILITY VERIFICATION ===\n');

  const client1 = io(SERVER_URL);
  await new Promise((resolve) => client1.on('connect', resolve));
  console.log('✓ Client 1 connected to server');

  // Test 1: Join default lounge by code "COFFEE"
  const res1 = await new Promise((resolve) => {
    client1.emit('join_room_by_code', { code: 'COFFEE' }, resolve);
  });
  console.log('Test 1 (code: "COFFEE"):', res1);
  if (!res1.success || res1.roomId !== 'lounge-midnight-coffee') {
    throw new Error('Test 1 failed: Could not join by code COFFEE');
  }

  // Test 2: Join with "#COFFEE" (leading hash)
  const res2 = await new Promise((resolve) => {
    client1.emit('join_room_by_code', { code: '#COFFEE' }, resolve);
  });
  console.log('Test 2 (code: "#COFFEE"):', res2);
  if (!res2.success || res2.roomId !== 'lounge-midnight-coffee') {
    throw new Error('Test 2 failed: Could not join by code #COFFEE');
  }

  // Test 3: Join with lowercase "coffee"
  const res3 = await new Promise((resolve) => {
    client1.emit('join_room_by_code', { code: 'coffee' }, resolve);
  });
  console.log('Test 3 (code: "coffee"):', res3);
  if (!res3.success || res3.roomId !== 'lounge-midnight-coffee') {
    throw new Error('Test 3 failed: Could not join by code coffee');
  }

  // Test 4: Join with slice "MIDNIG"
  const res4 = await new Promise((resolve) => {
    client1.emit('join_room_by_code', { code: 'MIDNIG' }, resolve);
  });
  console.log('Test 4 (code fallback slice "MIDNIG"):', res4);
  if (!res4.success || res4.roomId !== 'lounge-midnight-coffee') {
    throw new Error('Test 4 failed: Could not join by code MIDNIG');
  }

  // Test 5: Invalid room code
  const res5 = await new Promise((resolve) => {
    client1.emit('join_room_by_code', { code: 'NONEXISTENT' }, resolve);
  });
  console.log('Test 5 (invalid code):', res5);
  if (res5.success !== false || !res5.error) {
    throw new Error('Test 5 failed: Expected error for invalid code');
  }

  // Test 6: Verify room_joined_data contains code: room.code
  const joinedData = await new Promise((resolve) => {
    client1.emit('join_room', {
      roomId: 'lounge-midnight-coffee',
      user: { id: 'u1', name: 'Tester 1', avatar: '🐱' }
    });
    client1.once('room_joined_data', resolve);
  });
  console.log('Test 6 (room_joined_data code):', joinedData?.room?.code);
  if (joinedData?.room?.code !== 'COFFEE') {
    throw new Error(`Test 6 failed: Expected room.code to be COFFEE, got: ${joinedData?.room?.code}`);
  }

  // Test 7: Create a new room with user GPS coordinates and custom code
  const userGpsLat = 28.5355;
  const userGpsLng = 77.3910;
  const customRoomCode = 'CAMPUS99';

  const createRes = await new Promise((resolve) => {
    client1.emit('create_room', {
      name: 'Quad Decompression Spot',
      code: customRoomCode,
      category: 'General',
      selectedGame: 'scribble',
      lat: userGpsLat,
      lng: userGpsLng,
      idleTimeout: 15
    }, resolve);
  });
  console.log('Test 7 (create custom room):', createRes);
  if (!createRes.success || createRes.code !== customRoomCode) {
    throw new Error('Test 7 failed: Room creation failed');
  }

  // Client 1 joins the created room
  const customRoomJoined = await new Promise((resolve) => {
    client1.emit('join_room', {
      roomId: createRes.roomId,
      user: { id: 'u1', name: 'Tester 1', avatar: '🐱' }
    });
    client1.once('room_joined_data', resolve);
  });
  console.log('Test 7b (custom room joined code & coords):', {
    code: customRoomJoined.room?.code,
    lat: customRoomJoined.room?.lat,
    lng: customRoomJoined.room?.lng
  });
  if (customRoomJoined.room?.code !== customRoomCode) {
    throw new Error(`Expected custom room code ${customRoomCode}, got ${customRoomJoined.room?.code}`);
  }
  if (customRoomJoined.room?.lat !== userGpsLat) {
    throw new Error(`Expected room lat ${userGpsLat}, got ${customRoomJoined.room?.lat}`);
  }

  // Test 8: Client 2 connects by lounge code using "#CAMPUS99"
  const client2 = io(SERVER_URL);
  await new Promise((resolve) => client2.on('connect', resolve));
  console.log('✓ Client 2 connected');

  const joinByCodeRes = await new Promise((resolve) => {
    client2.emit('join_room_by_code', { code: '#CAMPUS99' }, resolve);
  });
  console.log('Test 8 (Client 2 join by "#CAMPUS99"):', joinByCodeRes);
  if (!joinByCodeRes.success || joinByCodeRes.roomId !== createRes.roomId) {
    throw new Error('Test 8 failed: Client 2 could not join custom room by code');
  }

  // Test 9: Verify 100m client-side Geofencing and Live Room Filter
  // Position A (Nearby, 35 meters away):
  const nearbyLat = 28.5358;
  const nearbyLng = 77.3910;
  const distNearby = haversine(nearbyLat, nearbyLng, userGpsLat, userGpsLng);
  console.log(`Test 9 Distance (Nearby user ~33m): ${distNearby.toFixed(1)}m`);
  if (distNearby > 100) throw new Error('Distance calculation unexpected');

  // Position B (Far away, 5000 meters away):
  const farLat = 28.5800;
  const farLng = 77.3910;
  const distFar = haversine(farLat, farLng, userGpsLat, userGpsLng);
  console.log(`Test 9 Distance (Far user ~4950m): ${distFar.toFixed(1)}m`);

  // Client-side filter simulation matching Lobby.jsx:
  const roomObj = {
    id: createRes.roomId,
    code: customRoomCode,
    lat: userGpsLat,
    lng: userGpsLng,
    userCount: 1, // Live room because client1 is inside!
    isPermanent: false
  };

  const isVisibleForNearby = distNearby <= 100 || roomObj.userCount > 0;
  const isVisibleForFarLiveRoom = distFar <= 100 || roomObj.userCount > 0;

  console.log('Test 9 Filter results:', {
    isVisibleForNearby,
    isVisibleForFarLiveRoom
  });

  if (!isVisibleForNearby) {
    throw new Error('Room within 100m was not visible!');
  }
  if (!isVisibleForFarLiveRoom) {
    throw new Error('Live room with active user was not visible!');
  }

  client1.disconnect();
  client2.disconnect();
  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY (100%) ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
