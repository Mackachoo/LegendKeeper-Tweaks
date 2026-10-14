import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

for (const member of (await lk.members.list()).data) console.log(member.role, member.name ?? member.email ?? member.id)

const email = `new-player-${Date.now()}@example.com`
const result = await lk.members.invite({ email })
console.log(result.success, result.alreadyMember ?? false, result.alreadyInvited ?? false)

const pending = await lk.invites.list()
const invite = pending.data.find((item) => item.email === email)
if (!invite) throw new Error(`no pending invite for ${email}`)
console.log(invite.role, invite.expiresAt)

await lk.invites.revoke({ inviteId: invite.id })
console.log((await lk.invites.list()).data.some((item) => item.id === invite.id))
