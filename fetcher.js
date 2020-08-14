const cheerio = require('cheerio')
const puppeteer = require('puppeteer');
var excel = require('excel4node');
const name = process.argv[2];
const username = process.argv[3];
const password = process.argv[4];
let crew_members = [];
var workbook = new excel.Workbook();
var worksheet = workbook.addWorksheet('INFO');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
    });
    await page.goto('http://alvaras.inem.pt/Autenticacao/Login.aspx', {
        waitUntil: 'networkidle0'
    });
    await page.click("#ctl00_MainContent_LoginUser_UserName");
    await page.keyboard.type(username);
    let password_array = password.split('');
    for (const key of password_array) {
        await page.click("input[value=\"" + key + "\"]");
    }
    await page.waitForSelector('#aspnetForm');
    await page.goto('http://alvaras.inem.pt/ZonaPrivada/Tripulantes/List.aspx');
    await page.waitForSelector('#gridview')
    await page.evaluate(() => {
        __doPostBack('ctl00$MainContent$listTripulantes', 'Page$Last');
    });
    await page.waitForSelector('#gridview')
    const number_of_pages = await page.evaluate(() => document.querySelector('.clsFormLabel').innerHTML);
    process.stdout.write("Número total de páginas: " + number_of_pages);
    for (let i = 1; i <= number_of_pages; i++) {
        await page.evaluate((i) => {
            __doPostBack('ctl00$MainContent$listTripulantes', 'Page$' + i);
        }, i);
        await page.waitForSelector('#gridview')
        let num_rows = await page.evaluate(() => document.querySelectorAll('.clsRow').length);
        let num_altrows = await page.evaluate(() => document.querySelectorAll('.clsAlternatingRow').length);
        let aux_function = async function (classname, j) {
            let info = await page.evaluate((classname, j) => document.querySelectorAll(classname)[j].innerHTML, classname, j);
            let $ = cheerio.load(info, {
                decodeEntities: false
            });
            let name = $("a").html();
            let link = $("a").attr("href").replace("javascript:", "");
            let status = $(".clsEstadoRegisto").attr("title");
            await page.evaluate((link) => {
                eval(link);
            }, link);
            await page.waitForSelector('#ctl00_MainContent_fvDetail_txtName')
            let content = await page.content();
            $ = cheerio.load(content, {
                decodeEntities: false
            });
            let nif = $("#ctl00_MainContent_fvDetail_txtNif").html();
            let inem_num = $("#ctl00_MainContent_fvDetail_txtNumeroMecanografico").html();
            let formation = $("#ctl00_MainContent_fvDetail_txttipoFormacaoId").html();
            let link_pdf = "http://alvaras.inem.pt" + $("#CompFormacaoDoc_download a").first().attr("href");
            let crew_member = {
                name: name,
                status: status,
                nif: nif,
                inem_num: inem_num,
                formation: formation,
                link_pdf: link_pdf,
            }
            crew_members.push(crew_member);
            await page.goBack();
            await page.waitForSelector('#gridview')
            return Promise.resolve();
        }
        for (let j = 0; j < num_rows; j++) {
            await aux_function(".clsRow", j);
        }
        for (let j = 0; j < num_altrows; j++) {
            await aux_function(".clsAlternatingRow", j);
        }
        process.stdout.write("Página " + i + " completa");
    }
    //Writing headers
    worksheet.cell(1, 1).string('Nome');
    worksheet.cell(1, 2).string('Estado');
    worksheet.cell(1, 3).string('Nº Contribuinte');
    worksheet.cell(1, 4).string('Nº Mecanográfico');
    worksheet.cell(1, 5).string('Formação');
    worksheet.cell(1, 6).string('Comprovativo Formação');
    let current_xlsx_row = 2;
    crew_members.forEach(element => {
        worksheet.cell(current_xlsx_row, 1).string(element.name);
        worksheet.cell(current_xlsx_row, 2).string(element.status);
        worksheet.cell(current_xlsx_row, 3).string(element.nif);
        worksheet.cell(current_xlsx_row, 4).string(element.inem_num);
        worksheet.cell(current_xlsx_row, 5).string(element.formation);
        worksheet.cell(current_xlsx_row, 6).link(element.link_pdf);
        current_xlsx_row++;
    });
    workbook.write("ficheiros/"+name + '.xlsx');
    await browser.close();
})();