require("dotenv").config()

const express = require("express")
const sendMessage = require("./whatsapp")
const parseSlots = require("./slotParser")
const db = require("./db")
const createCalendarEvent = require("./googleCalendar")

const app = express()
app.use(express.json())

// ---------------- HELPERS ---------------- //

function convertToISODate(dateStr) {
  const months = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12"
  }
  const [day, month] = dateStr.split(" ")
  const year = new Date().getFullYear()
  return `${year}-${months[month]}-${day.padStart(2, "0")}`
}

function convertTo24Hour(timeStr) {
  timeStr = timeStr.toLowerCase().trim()
  let [time, modifier] = timeStr.split(" ")
  let [hours, minutes] = time.split(":")
  hours = parseInt(hours)
  minutes = minutes ? parseInt(minutes) : 0

  if (modifier === "pm" && hours !== 12) hours += 12
  if (modifier === "am" && hours === 12) hours = 0

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:00`
}

function buildDate(dateValue, timeValue){
 const start = new Date(dateValue)
 const parts = timeValue.split(":")
 start.setHours(parseInt(parts[0]), parseInt(parts[1]), 0)
 return start
}

// ---------------- FETCH INTERVIEW DATA ---------------- //

function getInterviewDetails(callback){
  db.query(
  `SELECT 
      c.candidate_id,
      c.name AS candidate_name,
      c.phone AS candidate_phone,
      m.manager_id,
      m.name AS manager_name,
      m.phone AS manager_phone,
      j.job_id,
      j.job_name
  FROM candidates c
  JOIN job_roles j ON c.job_id = j.job_id
  JOIN manager m ON m.job_id = j.job_id
  LIMIT 1`,
  (err, result)=>{
    if(err || result.length === 0){
      console.log("Error fetching interview data", err)
      return
    }
    callback(result[0])
  })
}

// ---------------- SERVER START ---------------- //

app.listen(process.env.PORT || 3000, async () => {

  console.log("Server running")

  getInterviewDetails(async (data)=>{

    const message = `Hi ${data.manager_name} 👋

What are your available slots for ${data.job_name} interview for candidate ${data.candidate_name}?`

    await sendMessage(data.manager_phone, message)

  })

})

// ---------------- WEBHOOK ---------------- //

app.post("/webhook", (req, res) => {

const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

if(message){

const sender = message.from
const text = message.text?.body

// ---------------- MANAGER RESPONSE ---------------- //
getInterviewDetails((data)=>{

if(sender === data.manager_phone){
  // ❌ delete old available slots
if(sender === data.manager_phone){

console.log("Manager sent slots")

// STEP 1: DELETE old slots FIRST
db.query(
  "DELETE FROM slots WHERE manager_id=?",
  [data.manager_id],
  (err)=>{

    if(err){
      console.log("Delete error:", err)
      return
    }

    console.log("Old slots deleted")

    // STEP 2: PARSE NEW SLOTS
    const slots = parseSlots(text)

    // STEP 3: INSERT NEW SLOTS
    slots.forEach(slot => {

      db.query(
        `INSERT INTO slots (manager_id, job_id, slot_date, start_time, status)
         VALUES (?, ?, ?, ?, 'available')`,
        [data.manager_id, data.job_id, slot.date, slot.time]
      )

    })})


sendSlotsToCandidate(data)
  }
}else{

// ---------------- CANDIDATE RESPONSE ---------------- //

const slotNumber = parseInt(text)

if(!isNaN(slotNumber)){

db.query(
`SELECT * FROM slots
WHERE status='available'
AND (
  slot_date > CURDATE()
  OR (slot_date = CURDATE() AND start_time > CURTIME())
)
ORDER BY slot_date,start_time`,
(err, slots)=>{

const slot = slots[slotNumber-1]

if(!slot){
sendMessage(sender,"❌ Invalid slot number")
return
}

reserveSlot(slot.slot_id, sender)

})

}

}

})

}

res.sendStatus(200)
})

// ---------------- SEND SLOTS ---------------- //

function sendSlotsToCandidate(data){

db.query(
`SELECT * FROM slots
WHERE status='available'
AND (
  slot_date > CURDATE()
  OR (slot_date = CURDATE() AND start_time > CURTIME())
)
ORDER BY slot_date,start_time`,
async (err, result) => {

let message = "📅 Available Interview Slots\n\n"
let counter = 1
let currentDate = ""

result.forEach(slot => {

const dateObj = new Date(slot.slot_date)

const date = dateObj.toLocaleDateString("en-IN",{day:"numeric",month:"long"})

let timeObj = new Date(`1970-01-01T${slot.start_time}`)
let time = timeObj.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true})

if(date !== currentDate){
message += `\n${date}\n`
currentDate = date
}

message += `${counter}️⃣ ${time}\n`
counter++

})

message += "\nReply with slot number to confirm."

sendMessage(data.candidate_phone, message)

})
}

// ---------------- RESERVE SLOT ---------------- //

function reserveSlot(slotId, candidatePhone){

// get candidate_id
db.query(
"SELECT candidate_id FROM candidates WHERE phone=?",
[candidatePhone],
(err, result)=>{

if(result.length === 0){
console.log("Candidate not found")
return
}

const candidateId = result[0].candidate_id

db.query(
`UPDATE slots
SET status='booked',
candidate_id=?,
booked_at=NOW()
WHERE slot_id=? AND status='available'`,
[candidateId, slotId],
(err, res2)=>{

if(res2.affectedRows === 0){
sendMessage(candidatePhone,"⚠️ Slot already booked")
return
}

// get full details
db.query(
`SELECT s.*, c.name AS candidate_name, m.name AS manager_name, j.job_name, c.email AS candidate_email
FROM slots s
JOIN candidates c ON s.candidate_id = c.candidate_id
JOIN manager m ON s.manager_id = m.manager_id
JOIN job_roles j ON s.job_id = j.job_id
WHERE s.slot_id=?`,
[slotId],
async (err, result)=>{

const s = result[0]

const start = buildDate(s.slot_date, s.start_time)
const end = new Date(start.getTime() + 30*60000)

const date = start.toLocaleDateString("en-IN",{day:"numeric",month:"long"})
const time = start.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true})

// calendar
await createCalendarEvent({
  date: convertToISODate(date),
  time: convertTo24Hour(time),
  candidateEmail: s.candidate_email,
  managerEmail: process.env.MANAGER_EMAIL
})

// notify candidate
await sendMessage(candidatePhone,
`✅ Interview Confirmed

📅 ${date}
⏰ ${time}

Best of luck!`)

// notify manager
await sendMessage(process.env.MANAGER_PHONE,
`📌 Interview Booked

Candidate: ${s.candidate_name}
Role: ${s.job_name}

📅 ${date}
⏰ ${time}`)

})

})

})

}