import { NftCategoryField, ParsableNftCollection } from "../bcmr-v2.schema"
import { CreateBcmrOptions, createTokenRegistry } from "../registry-helpers"

export const templateId = '1'
export const bytecode = '00cf547f7c6b547f7c6b527f7c6b527f7c6b527f7c6b76825155a5696b51'
export const fields: NftCategoryField = {
    eventTime: {
        name: 'Event Time',
        description: 'The date and time of the event (Unix timestamp)',
        encoding: { type: 'number' },
    },
    gate: {
        name: 'Gate',
        description: 'The venue entrance gate (e.g. G2)',
        encoding: { type: 'utf8' },
    },
    section: {
        name: 'Section',
        description: 'The seating section number',
        encoding: { type: 'number' },
    },
    row: {
        name: 'Row',
        description: 'The seating row number',
        encoding: { type: 'number' },
    },
    seat: {
        name: 'Seat',
        description: 'The assigned seat label (e.g. 10B)',
        encoding: { type: 'utf8' },
    },
};
  
export const types = {
    '00000001': {
        name: 'Reserved Seat Ticket',
        description: 'Assigned seating ticket with gate, section, row, and seat.',
        fields: ['eventTime', 'gate', 'section', 'row', 'seat'],
    },
    '00000002': {
        name: 'VIP Pass',
        description: 'VIP access with front-row seating and dedicated VIP gate.',
        fields: ['eventTime', 'gate', 'section', 'row', 'seat'],
    },
};
  

export function createEventTicketRegistryTemplate(options: CreateBcmrOptions) {
    const template = createTokenRegistry(options)
    const timestamp = Object.keys(template.registry.identities![options.authbase]!)[0]!
    if (!template.registry.identities![options.authbase]![timestamp]!.token!.nfts) {
        throw new Error('NftCategory required')
    }
    template.registry.identities![options.authbase]![timestamp]!.token!.nfts!.fields = fields
    const collection = template.registry.identities![options.authbase]![timestamp]!.token!.nfts!.parse as ParsableNftCollection
    collection.bytecode = bytecode
    collection.types = types
    const cashtokensStudio = template.registry.extensions!.cashtokensStudio! as { [key: string]: string; }
    cashtokensStudio.t = templateId
    return template
}