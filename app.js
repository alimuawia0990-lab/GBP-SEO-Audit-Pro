const $ = id => document.getElementById(id);
const fields = ["businessName","category","phone","website","location","hours","description","services","photos","posts","reviewCount","rating","unanswered"];
const demo = {
  businessName:"BritGuard Locksmiths", category:"Locksmith", phone:"+44 117 000 0000",
  website:"https://example.com", location:"Bristol, UK", hours:"24 hours",
  description:"Local locksmith service providing emergency lockouts, lock repairs, lock replacement and security upgrades.",
  services:"Emergency Locksmith, Lockout Assistance, Lock Replacement, Door Lock Repair, uPVC Lock Repair, Security Upgrade",
  photos:18, posts:3, reviewCount:127, rating:4.8, unanswered:7, authorized:true
};

function showSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showSection(b.dataset.section)));

function getData(){
  const d={};
  fields.forEach(k=>d[k]=$(k).value);
  d.photos=+d.photos||0; d.posts=+d.posts||0; d.reviewCount=+d.reviewCount||0; d.rating=+d.rating||0; d.unanswered=+d.unanswered||0;
  d.authorized=$("authorized").checked;
  return d;
}
function setData(d){ fields.forEach(k=>$(k).value=d[k] ?? ""); $("authorized").checked=!!d.authorized; }

function audit(d){
  const issues=[], keywords=[];
  const add=(level,title,desc)=>issues.push({level,title,desc});
  const required=[["businessName","Business name is missing.","Enter the real-world business name used consistently by the business."],["category","Primary category is missing.","Choose the most accurate primary category."],["phone","Phone number is missing.","Add a customer-facing phone number."],["website","Website is missing.","Add the official business website if one exists."],["location","Address/service area is missing.","Complete the location information appropriate to the business."],["hours","Opening hours are missing.","Add accurate regular and special hours."],["description","Business description is missing.","Write a useful, factual description of services and business history."],["services","Services are missing.","Add the actual services offered."]];

  required.forEach(([k,t,x])=> d[k].trim()==="" ? add("critical",t,x) : add("pass",t.replace(" is missing"," is present"),"Field is populated."));
  if(d.photos<10) add("warning","Photo coverage is low",`Only ${d.photos} photos entered. Add genuine, useful business photos over time.`);
  else add("pass","Photo coverage looks healthy",`${d.photos} photos entered.`);
  if(d.posts<2) add("warning","Recent post activity is low","Consider publishing useful, non-spammy updates when relevant.");
  else add("pass","Recent post activity is present",`${d.posts} posts entered for the last 30 days.`);
  if(d.reviewCount===0) add("warning","No review count entered","Connect authorized profile data or enter current review data.");
  else add("pass","Review count available",`${d.reviewCount} reviews entered.`);
  if(d.rating>0 && d.rating<4) add("warning","Average rating needs attention",`Current entered rating is ${d.rating}. Focus on service quality and authentic customer feedback.`);
  else if(d.rating>=4) add("pass","Average rating is strong",`Current entered rating is ${d.rating}.`);
  if(d.unanswered>0) add("warning","Some reviews may need responses",`${d.unanswered} unanswered reviews entered. Respond professionally and individually where appropriate.`);
  else add("pass","No unanswered reviews entered","Keep monitoring new reviews.");

  // Policy-safe business name heuristic; never tells user to stuff keywords.
  const name=d.businessName.toLowerCase();
  const locTerms=(d.location||"").toLowerCase().split(/[,\s]+/).filter(x=>x.length>3);
  const serviceTerms=(d.services||"").toLowerCase().split(",").map(x=>x.trim()).filter(Boolean);
  const suspicious=[...locTerms.filter(x=>name.includes(x)),...serviceTerms.filter(x=>x.length>4&&name.includes(x))];
  const unique=[...new Set(suspicious)];
  if(unique.length) add("warning","Potential business-name keyword risk",`The name overlaps with location/service terms (${unique.slice(0,4).join(", ")}). Confirm the name exactly matches the real-world business name; do not add keywords just for SEO.`);
  else add("pass","No obvious keyword-stuffing pattern detected","The name does not show an obvious overlap with the supplied service/location terms.");

  const score=Math.max(0,Math.min(100, Math.round(100 - issues.filter(x=>x.level==="critical").length*10 - issues.filter(x=>x.level==="warning").length*4)));
  const profileFields=["businessName","category","phone","website","location","hours","description","services"];
  const profile=Math.round(profileFields.filter(k=>String(d[k]).trim()).length/profileFields.length*100);
  const critical=issues.filter(x=>x.level==="critical").length, warnings=issues.filter(x=>x.level==="warning").length;
  const tokens=(d.description+" "+d.services+" "+d.businessName).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g)||[];
  const freq={}; tokens.forEach(t=>freq[t]=(freq[t]||0)+1);
  Object.entries(freq).filter(([k,v])=>v>=4).slice(0,12).forEach(([k,v])=>keywords.push({term:k,count:v,risk:"Watch",note:"Repeated term detected. Keep content natural and useful rather than repeating keywords."}));
  if(!keywords.length) keywords.push({term:"No repeated keyword pattern",count:"—",risk:"Pass",note:"No obvious repetition pattern found in the supplied text."});
  return {issues,score,profile,critical,warnings,keywords};
}

function render(result,d){
  $("scoreStat").textContent=result.score; $("heroScore").querySelector("span").textContent=result.score;
  $("scoreStatus").textContent=result.score>=80?"Healthy":"Needs attention";
  $("reviewStat").textContent=d.reviewCount; $("ratingStat").textContent=`Rating ${d.rating||"—"}`;
  $("profileStat").textContent=result.profile+"%"; $("criticalStat").textContent=result.critical; $("warningStat").textContent=`Warnings ${result.warnings}`;
  const top=result.issues.filter(x=>x.level!=="pass").slice(0,6);
  $("quickResults").className="results"+(top.length?"":" empty");
  $("quickResults").innerHTML=top.length?top.map(x=>row(x)).join(""):"No open issues detected by this audit.";
  $("auditResults").className="audit-list";
  $("auditResults").innerHTML=result.issues.map(row).join("");
  $("keywordResults").className="keyword-list";
  $("keywordResults").innerHTML=result.keywords.map(k=>`<div class="keyword-item"><b>${esc(k.term)}</b><small>Occurrences: ${k.count}</small><span class="badge ${k.risk==="Pass"?"pass":"warning"}">${k.risk}</span><small>${esc(k.note)}</small></div>`).join("");
  $("rTotal").textContent=d.reviewCount; $("rAvg").textContent=d.rating||"—"; $("rUnanswered").textContent=d.unanswered; $("rResponse").textContent=d.reviewCount?Math.max(0,Math.round((1-d.unanswered/d.reviewCount)*100))+"%":"—";
  const counts=[["5★",Math.round(d.reviewCount*.83)],["4★",Math.round(d.reviewCount*.10)],["3★",Math.round(d.reviewCount*.04)],["2★",Math.round(d.reviewCount*.02)],["1★",Math.max(0,d.reviewCount-Math.round(d.reviewCount*.99))]];
  $("reviewBars").className="bars"; $("reviewBars").innerHTML=counts.map(([l,n])=>`<div class="bar-row"><b>${l}</b><div class="bar-track"><div class="bar-fill" style="width:${d.reviewCount?Math.min(100,n/d.reviewCount*100):0}%"></div></div><span>${n}</span></div>`).join("");
  const common7=["Fix all critical missing fields","Verify the business name against real-world branding","Complete accurate hours and service information","Respond to outstanding reviews professionally"];
  const common30=["Add useful genuine photos regularly","Review services and category accuracy","Publish relevant updates when appropriate","Check website contact information matches the profile"];
  const common60=["Connect authorized GBP performance data","Compare Search/Maps engagement over time","Re-audit monthly and document changes","Improve customer experience based on authentic feedback"];
  fillList("plan7",common7,result); fillList("plan30",common30,result); fillList("plan60",common60,result);
  $("mSearch").textContent="—"; $("mMaps").textContent="—"; $("mWeb").textContent="—"; $("mCalls").textContent="—";
  $("reportPreview").className="report";
  $("reportPreview").innerHTML=`<h2>${esc(d.businessName||"Business")} — GBP Audit Report</h2><p>Generated from the information entered into this tool. Values are not presented as live Google data unless connected through an authorized integration.</p><div class="report-grid"><div class="report-box">SEO Score<strong>${result.score}/100</strong></div><div class="report-box">Profile<strong>${result.profile}%</strong></div><div class="report-box">Reviews<strong>${d.reviewCount}</strong></div></div><h3>Priority issues</h3>${top.length?top.map(row).join(""):"No priority issues detected."}<h3>Optimization plan</h3><ul>${[...common7,...common30,...common60].map(x=>`<li>${x}</li>`).join("")}</ul>`;
}
function fillList(id,arr,result){$(id).innerHTML=arr.map(x=>`<li>${x}</li>`).join("")}
function row(x){return `<div class="result-row"><span class="badge ${x.level}">${x.level.toUpperCase()}</span><div><b>${esc(x.title)}</b><p>${esc(x.desc)}</p></div></div>`}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function run(){
  const d=getData(); const r=audit(d); render(r,d); showSection("dashboard"); toast("Audit completed");
}
$("auditBtn").addEventListener("click",run);
$("demoBtn").addEventListener("click",()=>{setData(demo);run()});
$("printBtn").addEventListener("click",()=>window.print());
$("connectBtn").addEventListener("click",()=>toast("Google OAuth integration requires backend credentials and approved API access."));
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
