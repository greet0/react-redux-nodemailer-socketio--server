const dl = require('./download.js')
const fs = require('fs')

const f1 = (file_data, object_name) => {
    try {
        const title = object_name.split(' ').join('-').toLowerCase() + "-" + Date.now()
        if (file_data?.toLowerCase().startsWith('http')) {
            if (['.png', '.jpg', '.jpeg'].some(x => 
                file_data?.toLowerCase().endsWith(x))) {
                dl(file_data, `./files/${title}.png`, (err) => { if (err) { console.log(err) } })
                return `http://localhost:${process.env.EXPRESS_PORT}/files/${title}.png`
            }
        }

        else if (['png', 'jpeg'].some(x => 
            file_data?.toLowerCase().startsWith(`"data:image/${x}`))) {
                const data = JSON.stringify(file_data).split(';base64,').pop()
                fs.writeFile(`./files/${title}.png`, data, { encoding: 'base64' }, (err) => { if (err) { console.log(err) } })
            return `http://localhost:${process.env.EXPRESS_PORT}/files/${title}.png`
        }

        else {
            return "IMG_URL"
        }
    } catch (error) {
        return file_data || "IMG_URL"
    }
}

module.exports = f1
