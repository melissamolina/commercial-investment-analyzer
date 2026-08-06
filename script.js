const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const pct = (n) => `${Number.isFinite(n) ? n.toFixed(2) : '0.00'}%`;
let currentAnalysis = {};
let uploadedFileName = '';

function values(){return {
  propertyType:$('propertyType').value,
  purchasePrice:+$('purchasePrice').value||0,
  downPayment:+$('downPayment').value||0,
  monthlyIncome:+$('monthlyIncome').value||0,
  monthlyExpenses:+$('monthlyExpenses').value||0,
  monthlyDebt:+$('monthlyDebt').value||0
}}

function calculate(){
  const v=values();
  const annualIncome=v.monthlyIncome*12;
  const annualExpenses=v.monthlyExpenses*12;
  const annualDebt=v.monthlyDebt*12;
  const noi=annualIncome-annualExpenses;
  const cashFlow=noi-annualDebt;
  const capRate=v.purchasePrice>0?(noi/v.purchasePrice)*100:0;
  const roi=v.downPayment>0?(cashFlow/v.downPayment)*100:0;
  const downPct=v.purchasePrice>0?(v.downPayment/v.purchasePrice)*100:0;
  currentAnalysis={...v,annualIncome,annualExpenses,annualDebt,noi,cashFlow,capRate,roi,downPct,uploadedFileName,createdAt:new Date().toISOString()};
  $('downPercent').textContent=pct(downPct);
  $('noiMetric').textContent=money.format(noi);
  $('capRateMetric').textContent=pct(capRate);
  $('cashFlowMetric').textContent=money.format(cashFlow);
  $('roiMetric').textContent=pct(roi);
  $('gaugeValue').textContent=pct(roi);
  $('summaryPurchase').textContent=money.format(v.purchasePrice);
  $('summaryDown').textContent=money.format(v.downPayment);
  $('summaryIncome').textContent=money.format(annualIncome);
  $('summaryExpenses').textContent=money.format(annualExpenses);
  $('summaryDebt').textContent=money.format(annualDebt);
  $('summaryNoi').textContent=money.format(noi);
  $('roiLabel').textContent='Estimate';
  $('gaugeCaption').textContent='Based on the information entered';
  return currentAnalysis;
}

$('analysis-form').addEventListener('submit',(e)=>{e.preventDefault();calculate();document.querySelector('.results-panel').scrollIntoView({behavior:'smooth',block:'start'});});
['purchasePrice','downPayment'].forEach(id=>$(id).addEventListener('input',()=>{const v=values();$('downPercent').textContent=pct(v.purchasePrice?100*v.downPayment/v.purchasePrice:0)}));

$('analysisUpload').addEventListener('change',(e)=>{
  const file=e.target.files&&e.target.files[0];
  uploadedFileName=file?file.name:'';
  $('uploadName').textContent=file?`Attached: ${file.name}`:'No file selected';
});

$('saveAnalysis').addEventListener('click',()=>{
  localStorage.setItem('commercialInvestmentAnalysis',JSON.stringify(calculate()));
  $('saveStatus').textContent='Analysis saved on this device.';
  setTimeout(()=>$('saveStatus').textContent='',3500);
});

const leadDialog=$('leadDialog');
$('pdfExport').addEventListener('click',()=>{calculate();leadDialog.showModal();});
$('leadClose').addEventListener('click',()=>leadDialog.close());
leadDialog.addEventListener('click',(e)=>{if(e.target===leadDialog)leadDialog.close()});

$('leadForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity())return;
  calculate();
  $('leadPropertyType').value=currentAnalysis.propertyType;
  $('leadPurchasePrice').value=currentAnalysis.purchasePrice;
  $('leadNoi').value=currentAnalysis.noi;
  $('leadCapRate').value=currentAnalysis.capRate.toFixed(2);
  $('leadCashFlow').value=currentAnalysis.cashFlow;
  $('leadRoi').value=currentAnalysis.roi.toFixed(2);
  $('leadUploadedFile').value=uploadedFileName;
  $('leadStatus').textContent='Creating your PDF…';
  const formData=new FormData(e.currentTarget);
  try{
    await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(formData).toString()});
  }catch(err){console.warn('Netlify Forms activates after deployment.',err)}
  generatePdf({name:$('leadName').value.trim(),email:$('leadEmail').value.trim(),phone:$('leadPhone').value.trim()});
  $('leadStatus').textContent='PDF created.';
  setTimeout(()=>leadDialog.close(),700);
});

function generatePdf(contact){
  if(!window.jspdf){alert('The PDF library did not load. Refresh and try again.');return}
  const {jsPDF}=window.jspdf;const doc=new jsPDF();
  doc.setFillColor(8,10,12);doc.rect(0,0,210,297,'F');
  doc.setTextColor(245,247,248);doc.setFontSize(22);doc.text('Commercial Investment Analyzer',15,22);
  doc.setTextColor(215,25,32);doc.setFontSize(10);doc.text('HUT REALTY + SPARTAN CAPITAL GROUP',15,30);
  doc.setDrawColor(215,25,32);doc.line(15,35,195,35);
  doc.setTextColor(190,195,198);doc.setFontSize(9);doc.text(`Prepared for: ${contact.name}`,15,43);doc.text(`Email: ${contact.email}`,15,48);
  if(contact.phone)doc.text(`Phone: ${contact.phone}`,15,53);
  if(uploadedFileName)doc.text(`Uploaded file reference: ${uploadedFileName}`,15,58);
  const rows=[['Property Type',currentAnalysis.propertyType],['Purchase Price',money.format(currentAnalysis.purchasePrice)],['Down Payment',money.format(currentAnalysis.downPayment)],['Annual Rental Income',money.format(currentAnalysis.annualIncome)],['Annual Operating Expenses',money.format(currentAnalysis.annualExpenses)],['Annual Debt Service',money.format(currentAnalysis.annualDebt)],['Net Operating Income (NOI)',money.format(currentAnalysis.noi)],['Cap Rate',pct(currentAnalysis.capRate)],['Estimated Annual Cash Flow',money.format(currentAnalysis.cashFlow)],['Estimated ROI',pct(currentAnalysis.roi)]];
  let y=70;rows.forEach(([a,b],i)=>{doc.setFillColor(i%2?17:12,i%2?22:16,i%2?27:20);doc.roundedRect(15,y-7,180,11,1,1,'F');doc.setTextColor(185,192,197);doc.text(a,19,y);doc.setTextColor(a.includes('ROI')?118:245,a.includes('ROI')?226:247,a.includes('ROI')?59:248);doc.text(String(b),190,y,{align:'right'});y+=13});
  doc.setTextColor(174,181,186);doc.setFontSize(9);const disc='Educational estimate only. Results depend on the information entered and are not a guarantee of future performance. Verify leases, expenses, financing, taxes, insurance, occupancy, and other material facts before making an investment decision.';doc.text(doc.splitTextToSize(disc,180),15,y+10);
  doc.setTextColor(245,247,248);doc.setFontSize(10);doc.text('HUT Realty: (813) 993-3439 | www.hutteam.com',15,275);doc.text('Spartan Capital Group: (443) 668-5727 | www.spartanenterprises.com',15,282);
  doc.save(`commercial-investment-analysis-${new Date().toISOString().slice(0,10)}.pdf`);
}

document.querySelectorAll('[data-modal]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.modal;$('infoContent').innerHTML=type==='privacy'?'<h2>Privacy Policy</h2><p>Contact information submitted through this website is used to provide the requested analysis and respond to inquiries. Do not upload confidential financial documents in Version 1.</p>':'<h2>Disclaimer</h2><p>This tool provides estimates for educational and preliminary evaluation purposes only. It is not financial, legal, tax, appraisal, lending, or investment advice and does not constitute a commitment to lend or a representation of property performance.</p>';$('infoDialog').showModal()}));

const saved=localStorage.getItem('commercialInvestmentAnalysis');
if(saved){try{const a=JSON.parse(saved);if(a.purchasePrice){$('propertyType').value=a.propertyType||'Retail';$('purchasePrice').value=a.purchasePrice;$('downPayment').value=a.downPayment;$('monthlyIncome').value=a.monthlyIncome;$('monthlyExpenses').value=a.monthlyExpenses;$('monthlyDebt').value=a.monthlyDebt;calculate()}}catch(e){}}
calculate();
