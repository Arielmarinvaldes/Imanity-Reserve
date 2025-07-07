const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const serviceAccount = require('./datos-imanity-reserve-firebase-adminsdk-fbsvc-24c5c6c8f2.json'); // Cambia la ruta

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/reservar', async (req, res) => {
  try {
    const { guestName, partySize, reservationDateTime, guestPhone, needsHighChair } = req.body;
    const newReservation = {
      guestName,
      partySize: parseInt(partySize, 10),
      dateTime: Timestamp.fromDate(new Date(reservationDateTime)),
      guestPhone: guestPhone || "",
      needsHighChair: needsHighChair || false,
      status: "Upcoming",
      tableId: ""
    };
    const docRef = await db.collection('reservations').add(newReservation);
    res.json({ success: true, reservationId: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log('API listening on port 3000'));
