require("dotenv").config()

console.log("Manager:", process.env.MANAGER_PHONE)

const express = require("express")
const sendMessage = require("./whatsapp")
const generateInvite = require("./calendarInvite")
const parseSlots = require("./slotParser")
const db = require("./db")
const createCalendarEvent = require("./googleCalendar")

const app = express()
app.use(express.json())

app.get("/", (req,res)=>{
res.send("Interview Scheduler Running")
})


// SAFE DATE FORMATTER
function formatDate(date){
 if(!date || isNaN(date.getTime())){
  console.log("Invalid date detected:", date)
  return ""
 }
 return date.toISOString().replace(/[-:]/g,"").split(".")[0]
}


// CREATE JS DATE FROM MYSQL DATE + TIME
function buildDate(dateValue, timeValue){

 const start = new Date(dateValue)

 const parts = timeValue.split(":")
 start.setHours(parseInt(parts[0]), parseInt(parts[1]), 0)

 return start
}


// SEND SLOTS TO CANDIDATE MANUALLY
app.get("/sendSlots", (req, res) => {

db.query(
`SELECT * FROM slots
WHERE status='available'
AND (slot_date > CURDATE()
OR (slot_date = CURDATE() AND start_time > CURTIME()))
ORDER BY slot_date, start_time`,
async (err, result) => {

if(err){
console.log(err)
return res.send("DB error")
}

if(result.length === 0){
return res.send("No slots available")
}

let message = "📅 Available Interview Slots\n\n"
let counter = 1
let currentDate = ""

result.forEach(slot => {

const dateObj = new Date(slot.slot_date)

const date = dateObj.toLocaleDateString("en-IN",{
day:"numeric",
month:"long"
})

let timeObj = new Date(`1970-01-01T${slot.start_time}`)

let time = timeObj.toLocaleTimeString("en-IN",{
hour:"numeric",
minute:"2-digit",
hour12:true
})

if(date !== currentDate){
message += `\n${date}\n`
currentDate = date
}

message += `${counter}️⃣ ${time}\n`
counter++

})

message += "\nReply with the slot number to confirm."

await sendMessage(process.env.CANDIDATE_PHONE, message)

res.send("Slots sent")

})

})


// CALENDAR DOWNLOAD ROUTE
app.get("/invite/:id.ics", (req, res) => {

const slotId = req.params.id

db.query(
"SELECT * FROM slots WHERE id=?",
[slotId],
(err, result)=>{

if(err || result.length === 0){
return res.send("Slot not found")
}

const slot = result[0]

const start = buildDate(slot.slot_date, slot.start_time)
const end = new Date(start.getTime() + 30*60000)

const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Interview
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
DESCRIPTION:Interview Meeting
END:VEVENT
END:VCALENDAR`

res.setHeader("Content-Type","text/calendar")
res.setHeader("Content-Disposition","attachment; filename=invite.ics")

res.send(ics)

})

})


// SERVER START
const PORT = process.env.PORT || 3000

app.listen(PORT, async () => {

 console.log("Server running on port", PORT)

 await sendMessage(
   process.env.MANAGER_PHONE,
   "Hi 👋 What are the available interview slots today?"
 )

})

// WEBHOOK VERIFICATION
app.get("/webhook", (req, res) => {

const VERIFY_TOKEN = "scheduler789"

const mode = req.query["hub.mode"]
const token = req.query["hub.verify_token"]
const challenge = req.query["hub.challenge"]

if(mode === "subscribe" && token === VERIFY_TOKEN){
console.log("Webhook verified")
res.status(200).send(challenge)
}else{
res.sendStatus(403)
}

})


// WEBHOOK MESSAGE RECEIVER
app.post("/webhook", (req, res) => {

const message =
req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

if(message){

const sender = message.from
const text = message.text?.body

console.log("Sender:", sender)
console.log("Message:", text)

if(sender === process.env.MANAGER_PHONE){

console.log("Message from MANAGER")

// DELETE OLD AVAILABLE SLOTS
db.query("DELETE FROM slots WHERE status='available'")

const slots = parseSlots(text)
console.log("Parsed slots:",slots)

slots.forEach(slot => {

db.query(
`INSERT INTO slots (manager_phone, slot_date, start_time)
VALUES (?, ?, ?)`,
[sender, slot.date, slot.time]
)

})

console.log("Slots saved")
sendSlotsToCandidate()

}else{

console.log("Message from CANDIDATE")

const slotNumber = parseInt(text)

if(!isNaN(slotNumber)){

db.query(
`SELECT * FROM slots
WHERE status='available'
AND (slot_date > CURDATE()
OR (slot_date = CURDATE() AND start_time > CURTIME()))
ORDER BY slot_date,start_time`,
(err, slots)=>{

if(err){
console.log(err)
return
}

const slot = slots[slotNumber-1]

if(!slot){
sendMessage(sender,"❌ Invalid slot number")
return
}

reserveSlot(slot.id, sender)

})

}

}

}

res.sendStatus(200)

})


// SEND SLOTS AUTOMATICALLY
function sendSlotsToCandidate(){

db.query(
`SELECT * FROM slots
WHERE status='available'
AND (slot_date > CURDATE()
OR (slot_date = CURDATE() AND start_time > CURTIME()))
ORDER BY slot_date,start_time`,
async (err, result) => {

if(err){
console.log(err)
return
}

let message = "📅 Available Interview Slots\n\n"

let counter = 1
let currentDate = ""

result.forEach(slot => {

const dateObj = new Date(slot.slot_date)

const date = dateObj.toLocaleDateString("en-IN",{
day:"numeric",
month:"long"
})

let timeObj = new Date(`1970-01-01T${slot.start_time}`)

let time = timeObj.toLocaleTimeString("en-IN",{
hour:"numeric",
minute:"2-digit",
hour12:true
})

if(date !== currentDate){
message += `\n${date}\n`
currentDate = date
}

message += `${counter}️⃣ ${time}\n`
counter++

})

message += "\nReply with the slot number to confirm."

sendMessage(process.env.CANDIDATE_PHONE, message)

})

}


// RESERVE SLOT
function reserveSlot(slotId, candidatePhone){

db.query(
`UPDATE slots
SET status='booked',
reserved_by=?,
booked_at=NOW()
WHERE id=? AND status='available'`,
[candidatePhone, slotId],
(err, result)=>{

if(err){
console.log(err)
return
}

if(result.affectedRows === 0){

sendMessage(candidatePhone,
"⚠️ Sorry, this slot was already booked.")

}else{

db.query(
"SELECT * FROM slots WHERE id=?",
[slotId],
async (err, slot)=>{

const s = slot[0]

const start = buildDate(s.slot_date, s.start_time)
const end = new Date(start.getTime() + 30*60000)

const date = start.toLocaleDateString("en-IN",{day:"numeric",month:"long"})
const time = start.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true})

const inviteLink = generateInvite(slotId,s.slot_date,s.start_time)

const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Interview
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
DESCRIPTION:Interview Meeting
END:VEVENT
END:VCALENDAR`


// GET EMAIL FROM DB

// GET CANDIDATE EMAIL FROM DB
db.query(
  "SELECT email FROM candidates WHERE phone=? LIMIT 1",
  [candidatePhone],
  async (err, result) => {

    if (err) {
      console.log(err)
      return
    }

    if (result.length === 0) {
      console.log("❌ Candidate email not found")
      return
    }

    const candidateEmail = result[0].email

    if (!candidateEmail) {
      console.log("❌ Candidate email missing in DB")
      return
    }

    const managerEmail = process.env.MANAGER_EMAIL

    console.log("📧 Candidate:", candidateEmail)
    console.log("📧 Manager:", managerEmail)

    // ✅ CREATE GOOGLE CALENDAR EVENT
    await createCalendarEvent({
      date,
      time,
      candidateEmail,
      managerEmail
    })

    // ✅ WHATSAPP TO CANDIDATE
    await sendMessage(candidatePhone,
`✅ Interview Confirmed

📅 Date: ${date}
⏰ Time: ${time}

📩 Calendar invite sent. Please check your email.`)

    // ✅ WHATSAPP TO MANAGER
    await sendMessage(process.env.MANAGER_PHONE,
`📌 Interview Booked

📅 Date: ${date}
⏰ Time: ${time}

Candidate: ${candidatePhone}

📩 Calendar invite sent.`)

  }
)

})

}

})

}