const $=id=>document.getElementById(id);
$("auditBtn").onclick=run;
$("mapsUrl").addEventListener("keydown",e=>{if(e.key==="Enter")run()});

async function run(){
  const url=$("mapsUrl").value.trim();
  $("message").textContent="";
  if(!url || !/^https?:\/\//i.test(url)){ $("message").textContent="Please paste a valid Google Maps / GBP URL."; return; }
  $("loading").classList.remove("hidden"); $("dashboard").classList.add("hidden");
  try{
    const r=await fetch("/api/audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Audit failed");
    render(data);
  }catch(e){
    $("message").textContent=e.message;
  }finally{$("loading").classList.add("hidden")}
}

function render(d){
  $("dashboard").classList.remove("hidden");
  $("businessName").textContent;
  $("businessName").textContent=d.place.name||"Business";
  $("address").textContent=d.place.address||"Address not available";
  $("businessType").textContent=(d.place.category||"BUSINESS PROFILE").toUpperCase();
  $("mapsLink").href=d.place.mapsUri||$("mapsUrl").value;
  $("score").textContent=d.audit.score;
  $("rating").textContent=d.place.rating??"—";
  $("stars").textContent=d.place.rating?("★".repeat(Math.round(d.place.rating))+"☆".repeat(5-Math.round(d.place.rating))):"";
  $("reviewCount").textContent=d.place.reviewCount??"—";
  $("phone").textContent=d.place.phone||"Not available";
  $("website").textContent=d.place.website||"Not available";
  const info=[
    ["Business name",d.place.name],["Category",d.place.category],["Address",d.place.address],
    ["Phone",d.place.phone],["Website",d.place.website],["Opening hours",d.place.hours],
    ["Business status",d.place.status],["Place ID",d.place.placeId]
  ];
  $("infoGrid").innerHTML=info.map(x=>`<div class="info"><small>${esc(x[0])}</small><b>${esc(x[1]||"Not available")}</b></div>`).join("");
  $("issues").innerHTML=d.audit.issues.map(i=>`<div class="issue"><span class="badge ${i.level}">${i.level.toUpperCase()}</span><div><b>${esc(i.title)}</b><p>${esc(i.detail)}</p></div></div>`).join("");
  $("issueSummary").textContent=`${d.audit.critical} critical • ${d.audit.warning} warnings`;
  $("keywords").innerHTML=d.audit.keywords.map(k=>`<div class="keyword"><b>${esc(k.term)}</b><span class="badge ${k.risk==="PASS"?"pass":"warning"}">${k.risk}</span><span>${esc(k.detail)}</span></div>`).join("");
  const total=d.place.reviewCount||0, unanswered=d.audit.unanswered;
  $("reviewHealth").innerHTML=`<div class="review-box"><div class="review-line"><b>${total}</b><span>Total reviews</span></div><div class="review-line"><b>${d.place.rating??"—"}</b><span>Average rating</span></div><div class="review-line"><b>${unanswered}</b><span>Potential response follow-up</span></div><div class="review-line"><b>${total?Math.max(0,Math.round((1-unanswered/total)*100))+"%":"—"}</b><span>Estimated response coverage</span></div><div class="review-track"><div class="review-fill" style="width:${total?Math.max(0,Math.min(100,(1-unanswered/total)*100)):0}%"></div></div></div>`;
  fill("plan7",d.audit.plan7); fill("plan30",d.audit.plan30); fill("plan60",d.audit.plan60);
}
function fill(id,a){$(id).innerHTML=a.map(x=>`<li>${esc(x)}</li>`).join("")}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
