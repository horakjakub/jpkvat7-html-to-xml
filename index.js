fs = require('fs')

const fileNameArg = process.argv.filter(arg => arg.startsWith('-f='))[0];
const yearArg = process.argv.filter(arg => arg.startsWith('-y='))[0];
const monthArg = process.argv.filter(arg => arg.startsWith('-m='))[0];

if (!fileNameArg || !monthArg || !yearArg) {
  console.log("Please provide filename in correct format ('-f=somefile.html -y=2020 -m=3')"); 
  return;
}

const month = monthArg.slice(3, monthArg.length);
const year = yearArg.slice(3, yearArg.length);
const fileName = fileNameArg.slice(3, fileNameArg.length);

fs.readFile(fileName, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }

  const htmlTbody = data.slice(data.indexOf('<tbody>'), data.indexOf('</tbody>'))
  const htmlRows = htmlTbody.split('</tr>'); 
  const dataRows = htmlRows 
    .map((row) => row.split('</td>').map(removeSigns).map(el => el.split("&quot;").join('"')))
    .filter((row) => !(!row[1] && !row[2] && !row[3]));

  const purchaseVatIncludedDataRows = dataRows.filter((row) => row[11].trim() === 'x');
  const lastDayOfMonthDate = `${year}-${formatMonth(month)}-${lastDayOfMonth(month, year)}`;

  const purchaseVatIncludedXMLRecord = purchaseVatIncludedDataRows.map((el, idx) => {
    return `
        <ZakupWiersz>
          <LpZakupu>${idx + 1}</LpZakupu>
          <KodKrajuNadaniaTIN>PL</KodKrajuNadaniaTIN>
          <NrDostawcy>${getNIP(el[3])}</NrDostawcy>
          <NazwaDostawcy>${getCompanyName(el[3])}</NazwaDostawcy>
          <DowodZakupu>${el[2]}</DowodZakupu>
          <DataZakupu>${el[1]}</DataZakupu>
          <DataWplywu>${lastDayOfMonthDate}</DataWplywu>
          <DokumentZakupu>MK</DokumentZakupu>
          <K_42>${el[12]}</K_42>
          <K_43>${el[13]}</K_43>
        </ZakupWiersz>`
  });  

 const purchaseSummary =  `
    <ZakupCtrl>
      <LiczbaWierszyZakupow>${purchaseVatIncludedXMLRecord.length}</LiczbaWierszyZakupow>
      <PodatekNaliczony>${purchaseVatIncludedDataRows.reduce((acc, el) => acc + Number(el[13]), 0)}</PodatekNaliczony>
    </ZakupCtrl>`;

  const xmlTxt = [
    ...purchaseVatIncludedXMLRecord,
    purchaseSummary,
  ].join('');


  fs.writeFile(`${formatMonth(month)}-${year}.xml`, xmlTxt,  (err) => {
      if (!err) {
        console.log('Convertion performed successully')
      } else {
        console.error(err)
      }
  }); 
});

function getNIP(txt) {
    if (txt.indexOf("NIP:") === -1) throw Error('There is no NIP for ' + txt);
    return txt.slice(txt.indexOf("NIP:") + 4, txt.indexOf(",")).trim();    
}

function getCompanyName(txt) {
    if (txt.indexOf(",") === -1) throw Error('Company name is declared incorrectly for ' + txt);
    return txt.slice(txt.indexOf(",") + 1, txt.length).trim();    
}

function removeSigns(text) {
    if (text.indexOf(">") === -1 || 
        (text.indexOf("</") !== -1 && text.indexOf(">") > text.indexOf("</"))
       ) return text;

    if (text.indexOf("</") !== -1) {
        const newText = text.slice(0, text.indexOf("</"));
        return removeSigns(newText);
    }
    const newText = text.slice(text.indexOf(">") + 1, text.length);

    return removeSigns(newText); 
}

function lastDayOfMonth(month, year) {
    if (parseInt(month) === 2 && parseInt(year) % 4 === 0) {
        return '29';
    }
    if (parseInt(month) === 2) { 
        return '28';
    }
    if (parseInt(month) % 2 === 0) {
        return '31';
    }
    return '30';
}

function formatMonth(month) {
  return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    .find(mo => mo.includes(month));
} 