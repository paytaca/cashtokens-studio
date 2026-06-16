export type PublicationStrategy = {
  bumpType: 'major' | 'minor' | 'patch'
  newVersion: { major: number, minor: number, patch: number }
}