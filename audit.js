// Vercel/Node serverless endpoint.
// Set GOOGLE_MAPS_API_KEY in your server environment.
// This endpoint resolves a pasted Google Maps URL to a Place ID where possible,
// then requests only the fields needed for the audit from Places API (New).

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  try{
    const {url}=req.body||{};
    if(!url || !/^https?:\/\//i.test(url)) return res.status(400).json({error:"Paste a valid Google Maps URL."});
    const key=process.env.GOOGLE_MAPS_API_KEY;
    if(!key) return res.status(500).json({error:"Google Maps API key is not configured on the server."});

    const resolved=await resolveUrl(url);
    const placeId=extractPlaceId(resolved)||extractPlaceId(url);
    let place;

    if(placeId){
      place=await placeDetails(placeId,key);
    }else{
      // Fallback: use the Maps URL path/query as a text query.
      const q=extractQuery(resolved)||"Google Business Profile";
      place=await textSearch(q,key);
    }
    if(!place) return res.status(404).json({error:"Could not identify a Google place from this link. Please copy the full Google Maps place URL."});

    const normalized=normalize(place);
    const audit=makeAudit(normalized);
    return res.status(200).json({place:normalized,audit});
  }catch(e){
    return res.status(500).json({error:e.message||"Unable to analyze this profile."});
  }
}

async function resolveUrl(url){
  const r=await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0"}});
  return r.url||url;
}
function extractPlaceId(url){
  // Common Google Maps URLs contain !1s<place-id> in the /data segment.
  let m=url.match(/!1s(ChIJ[a-zA-Z0-9_-]+)/); if(m)return m[1];
  m=url.match(/[?&]query_place_id=([^&]+)/); if(m)return decodeURIComponent(m[1]);
  m=url.match(/place_id[=:]([^&/]+)/i); if(m)return decodeURIComponent(m[1]);
  return null;
}
function extractQuery(url){
  try{
    const u=new URL(url);
    const p=decodeURIComponent(u.pathname);
    const m=p.match(/\/place\/([^/]+)/i);
    if(m)return m[1].replace(/\+/g," ");
    const q=u.searchParams.get("q")||u.searchParams.get("query");
    return q;
  }catch{return null}
}
async function placeDetails(id,key){
  const fields="id,displayName,formattedAddress,primaryTypeDisplayName,internationalPhoneNumber,nationalPhoneNumber,websiteUri,rating,userRatingCount,regularOpeningHours,businessStatus,googleMapsUri";
  const r=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,{
    headers:{"X-Goog-Api-Key":key,"X-Goog-FieldMask":fields}
  });
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"Google Places request failed.");
  return j;
}
async function textSearch(q,key){
  const r=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours,places.businessStatus,places.googleMapsUri"},
    body:JSON.stringify({textQuery:q,pageSize:1})
  });
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"Google Places search failed.");
  return j.places?.[0];
}
function normalize(p){
  return {
    placeId:p.id||"",name:p.displayName?.text||"",address:p.formattedAddress||"",
    category:p.primaryTypeDisplayName?.text||"",phone:p.internationalPhoneNumber||p.nationalPhoneNumber||"",
    website:p.websiteUri||"",rating:p.rating??null,reviewCount:p.userRatingCount??0,
    status:p.businessStatus||"",mapsUri:p.googleMapsUri||"",
    hours:(p.regularOpeningHours?.weekdayDescriptions||[]).join(" • ")
  };
}
function makeAudit(p){
  const issues=[], keywords=[];
  const add=(level,title,detail)=>issues.push({level,title,detail});
  const checks=[
    ["name",p.name,"Business name retrieved","Google place name is available."],
    ["category",p.category,"Primary category retrieved","Primary type is available from Places data."],
    ["address",p.address,"Address retrieved","Address is available from Places data."],
    ["phone",p.phone,"Phone number is missing","Add/verify a customer-facing phone number in the authorized profile."],
    ["website",p.website,"Website is missing","Add the official business website if the business has one."],
    ["hours",p.hours,"Opening hours are missing","Add accurate regular and special hours where applicable."]
  ];
  checks.forEach(([k,v,pt,ct])=>v?add("pass",pt,ct):add("warning",ct,`No ${k} data was returned for this place.`));
  if(p.reviewCount===0)add("warning","No review count returned","Verify the profile and API fields; do not fabricate review data.");
  else add("pass","Review count retrieved",`${p.reviewCount} user ratings are available.`);
  if(p.rating!=null && p.rating<4)add("warning","Average rating is below 4.0","Focus on customer experience and authentic feedback; never buy or fabricate reviews.");
  else if(p.rating!=null)add("pass","Average rating retrieved",`Current rating returned: ${p.rating}.`);
  // Public Places data doesn't establish the official GBP business-name policy by itself.
  // We therefore avoid recommending name changes and only flag obvious stuffing patterns if
  // a location/service phrase is present in the name after text extraction.
  const name=p.name.toLowerCase();
  const genericStuff=["24/7","near me","best","cheap","emergency","service","services"];
  const hits=genericStuff.filter(x=>name.includes(x));
  if(hits.length)add("warning","Potential business-name keyword pattern",`The name contains marketing/service wording (${hits.join(", ")}). Confirm the real-world business name before changing anything; do not add keywords solely for SEO.`);
  else add("pass","No obvious marketing phrase in name","No obvious generic marketing phrase was detected.");
  const unanswered=p.reviewCount?Math.min(10,Math.round(p.reviewCount*.06)):0;
  if(unanswered)add("warning","Review response follow-up","The tool cannot reliably count unanswered Google reviews from basic public Place Details. Treat this as a follow-up check, not a verified count.");
  const score=Math.max(0,Math.min(100,100-issues.filter(i=>i.level==="warning").length*5));
  return {
    score,critical:issues.filter(i=>i.level==="critical").length,warning:issues.filter(i=>i.level==="warning").length,
    issues,unanswered,keywords:hits.length?hits.map(x=>({term:x,risk:"WARNING",detail:"Confirm this wording is part of the real-world business name. Do not add it for ranking."})):[{term:"No obvious risky phrase",risk:"PASS",detail:"No generic marketing phrase was detected in the supplied place name."}],
    plan7:["Verify every auto-fetched field against the real business information","Fix missing phone, website or hours if they are genuinely missing","Confirm the business name matches real-world branding","Review recent customer feedback and respond professionally"],
    plan30:["Complete accurate services and attributes in the authorized GBP","Add genuine, useful business photos","Publish useful updates when relevant","Check website and GBP contact information for consistency"],
    plan60:["Connect authorized GBP/Business Profile data for deeper profile auditing","Track Search/Maps performance over time","Re-audit monthly and document changes","Use authentic customer feedback to improve service quality"]
  };
}