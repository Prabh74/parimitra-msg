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


            const phoneNumbers = ['9495050608']
            if (currTime - docTimestamp > 900_000) {
                if (status) {
                    phoneNumbers.forEach(async (num) => {
                        const message = await client.messages.create({
                            from: "MG1d61c968e1c62832967785c085b0e807",
                            contentSid: "HX9d81f37958173195edbcac11b60e546f",
                            contentVariables: JSON.stringify({
                                1: locationId, 2: docTimestamp.toLocaleString('en-us', {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }), 3: ((currTime - docTimestamp) / 60_000).toFixed(2)
                            }),
                            to: `whatsapp:+91${num}`,
                        });
                    })
                    await statusRef.update({ adminStatus: false })
                }
            } else {
                if (!status) {
                    phoneNumbers.forEach(async (num) => {
                        const message = await client.messages.create({
                            from: "MG1d61c968e1c62832967785c085b0e807",
                            contentSid: "HX51267185eec7fcae5773f169dbdad306",
                            contentVariables: JSON.stringify({
                                1: locationId, 2: docTimestamp.toLocaleString('en-us', {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })
                            }),
                            to: `whatsapp:+91${num}`,
                        });
                    })
                    await statusRef.update({ adminStatus: true })
                }
            }
        }
    })
}, 1020_000)



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
        const values = await valuesRef.orderBy('datetime', 'desc').limit(20).get()

        const filtered = []
        if (values.empty) return;
        values.forEach(value => {
            const data = value.data()
            if (new Date() - new Date(data.datetime) <= 3600_000) filtered.push(data)
        })

        const entries = filtered.reduce((acc, curr) => acc + curr['total entry count'], 0)
        const exits = filtered.reduce((acc, curr) => acc + curr['total exit count'], 0)

        console.log(locationId, entries, exits)
        const message = await client.messages.create({
            from: "MG1d61c968e1c62832967785c085b0e807",
            contentSid: "HX4fa2a74472e1d1734f47a05a9dd91229",
            contentVariables: JSON.stringify({ 1: locationId, 2: entries.toString(), 3: exits.toString() }),
            to: `whatsapp:+91 9582753345 `,
        });
        console.log(message)
    })

}, 3600_000)