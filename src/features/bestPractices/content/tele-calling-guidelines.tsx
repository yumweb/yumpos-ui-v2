export default function Content() {
  return (
    <>
      <h2>Leads Validation Procedure</h2>
      <ul>
        <li><strong>To be validated:</strong> Arrival of new leads (once new lead got generated / added in POS it shows "To be validated"). Not yet called customer.</li>
        <li><strong>Prospective:</strong> Customer will not confirm his interest (YES or NO). Example - "I'm busy now" / "I will call you later". This lead has to be followed up with a followup date (we should only confirm followup date with client rather asking them for a date).</li>
        <li><strong>Hot:</strong> Customer confirmed his/her appointment with DATE & TIME.</li>
        <li><strong>Cold:</strong> Customers are not interested in coming. Example - Just called to know offers / accidentally I have checked / Long distance / out of station.</li>
        <li><strong>Call Not Connected:</strong> Number not reachable, Switch off, Busy tone, Rejected, Not answering. (For these leads follow up date has to be marked for next day).</li>
      </ul>
      <h2>WhatsApp Letter</h2>
      <p>Dear Customer, thanks for registering your contact details with us "Studio11 Salon & Spa - Kochi" on Facebook / Instagram! We look forward to seeing you at the salon. Offer valid till - 25th Sep!</p>
      <ul>
        <li>Address - [Location]</li>
        <li>Services we offer: Hair | Skin | Beauty | Makeup | Chemical treatments</li>
        <li>Contact @ [Phone Number]</li>
        <li>Google location</li>
      </ul>
      <h2>Pictures to Send Along with the Letter</h2>
      <ul>
        <li>Outside branding</li>
        <li>Reception (Manager with a smile)</li>
        <li>Hair section</li>
        <li>Shampoo station</li>
        <li>Pedicure</li>
        <li>Facial room</li>
        <li>Bridal room</li>
      </ul>
    </>
  );
}
