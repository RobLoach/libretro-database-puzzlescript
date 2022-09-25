const datfile = require('robloach-datfile')
const fs = require('fs')
const path = require('path')
const gamesDir = 'puzzlescript/games'
const md5 = require('md5')
const crc32 = require('crc32')
const readline = require('readline')
const sha1 = require('sha1')
const pkg = require('./package.json')

async function readMetaData(file) {
    const fileStream = fs.createReadStream(file);
  
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const out = {}

    for await (const line of rl) {
      const split = line.split(' ', 2)
      const keywords = ['title', 'author', 'homepage']
      if (keywords.length > 1 && keywords.includes(split[0])) {
        const keyword = split[0]
        out[keyword] = line.substring(keyword.length + 1)
            .replaceAll('"', '\'')
            .trim()
      }
    }
    return out
}

async function go() {
    const games = fs.readdirSync(gamesDir).filter(function (file) {
        return fs.statSync(path.join(gamesDir, file)).isDirectory();
    });

    let dat = []
    let datOuput = `clrmamepro (
    name "PuzzleScript"
    description "PuzzleScript"
    version "${pkg.version}"
    homepage "${pkg.homepage}"
)
`
    
    for (let game of games) {
        const gamePath = path.join(gamesDir, game)
        const scriptFiles = fs.readdirSync(gamePath).filter(function(file) {
            return path.extname(file) != '.md' && file.includes('readme') == false
        })
        const scriptFile = path.join(gamePath, scriptFiles[0])
        const fileStat = fs.statSync(scriptFile)
        if (fileStat.isDirectory()) {
            continue;
        }
        const fileContents = fs.readFileSync(scriptFile)
        let gameInfo = {
            title: game,
            slug: game,
            md5: md5(fileContents),
            size: fileStat.size,
            crc32: crc32(fileContents),
            sha1: sha1(fileContents)
        }

        let metaData = await readMetaData(scriptFile)

        gameInfo = {...gameInfo,  ...metaData}
        datParams = ''
        
        if (gameInfo.description) {
            datParams += `\n    description "${gameInfo.description}"`
        }
        if (gameInfo.author) {
            datParams += `\n    developer "${gameInfo.author}"`
        }
        if (gameInfo.homepage) {
            datParams += `\n    homepage "${gameInfo.homepage}"`
        }
        if (gameInfo.slug) {
            datParams += `\n    id "${gameInfo.slug}"`
        }

        datOuput += `
game (
    name "${gameInfo.title}"${datParams}
    rom ( name "${gameInfo.slug}.pz" size ${gameInfo.size} crc ${gameInfo.crc32} md5 ${gameInfo.md5} sha1 ${gameInfo.sha1} )
}
`
    }

    fs.writeFileSync('libretro-database/dat/PuzzleScript.dat', datOuput)

}

go()
