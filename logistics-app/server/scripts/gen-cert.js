import { execSync } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const certsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../certs')
if (!existsSync(certsDir)) mkdirSync(certsDir)

const ip = process.env.CERT_IP || '127.0.0.1'
const keyOut = `${certsDir}/key.pem`
const certOut = `${certsDir}/cert.pem`

execSync(
  `openssl req -x509 -newkey rsa:4096` +
  ` -keyout "${keyOut}" -out "${certOut}"` +
  ` -days 3650 -nodes` +
  ` -subj "/CN=TAS-Local"` +
  ` -addext "subjectAltName=IP:${ip},IP:127.0.0.1,DNS:localhost"`,
  { stdio: 'inherit' }
)

console.log(`\nCertificate written to: ${certsDir}`)
console.log('key.pem + cert.pem ready.')
