const { Resend } = require("resend")

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendEmailInvite(to, date, time, icsContent){

 console.log("EMAIL FUNCTION CALLED:", to)

 try {

  await resend.emails.send({
   from: "onboarding@resend.dev",
   to: to,
   subject: "Interview Confirmation",
   text: `Interview confirmed on ${date} at ${time}`,
   attachments: [
    {
     filename: "invite.ics",
     content: Buffer.from(icsContent).toString("base64")
    }
   ]
  })

  console.log("✅ EMAIL SENT SUCCESSFULLY")

 } catch(err){
  console.log("❌ EMAIL ERROR:", err)
 }

}

module.exports = sendEmailInvite