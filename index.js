import twilio from "twilio";
import dotenv from "dotenv";
import admin from 'firebase-admin'
dotenv.config()

const accountSid = process.env.accountSid
const authToken = process.env.authToken
const client = twilio(accountSid, authToken);

const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
        type: process.env.fb_1_type,
        projectId: process.env.fb_1_project_id,
        privateKeyId: process.env.fb_1_private_key_id,
        privateKey: process.env.fb_1_private_key.replace(/\\n/g, '\n'),
        clientEmail: process.env.fb_1_client_email,
        clientId: process.env.fb_1_client_id,
    })
}, "firebaseApp")

const db = admin.firestore(firebaseApp)

const usersApp = admin.initializeApp({
    credential: admin.credential.cert({
        type: process.env.fb_2_type,
        projectId: process.env.fb_2_project_id,
        privateKeyId: process.env.fb_2_private_key_id,
        privateKey: process.env.fb_2_private_key.replace(/\\n/g, '\n'),
        clientEmail: process.env.fb_2_client_email,
        clientId: process.env.fb_2_client_id,
    })
}, "usersApp")


const usersdb = admin.firestore(usersApp)


setInterval(async () => {
    const devicesRef = usersdb.collection('Devices')
    const devices = await devicesRef.get()

    const arr = []

    devices.forEach(device => {
        const deviceData = device.data()
        arr.push(deviceData.locationID !== "" ? { locationId: deviceData.locationID, deviceId: device.id } : { locationId: device.id, deviceId: device.id })
    })

    arr.forEach(async ({ locationId, deviceId }) => {
        const valuesRef = db.collection(locationId)
        const values = await valuesRef.orderBy('datetime', 'desc').limit(1).get()

        if (!values.empty) {
            const doc = values.docs[0];
            const docData = doc.data();
            const docTimestamp = new Date(docData.datetime);
            const currTime = new Date()

            const statusRef = usersdb.collection('Devices').doc(deviceId)
            const statusDoc = await statusRef.get()
            const status = statusDoc.data().adminStatus

            if (currTime - docTimestamp > 900_000) {
                const phoneNumbers = ['9779517458']
                if (status) {
                    phoneNumbers.forEach(async (num) => {
                        const message = await client.messages.create({
                            body: `Error from Parimitra. Data from ${collectionName} was last received at ${docTimestamp}. More than ${(currTime - docTimestamp) / 60_000}mins have passed`,
                            from: "whatsapp:+14155238886",
                            to: `whatsapp:+91${num}`,
                        });
                    })
                    await statusRef.update({ adminStatus: false })
                }
            } else {
                if (!status) await statusRef.update({ adminStatus: true })
            }
        }
    })
}, 1020_000)