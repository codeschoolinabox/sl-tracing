import deepFreeze from '../../../utils/deep-freeze.js';

import id from './id.js';
import _langs from './langs.js';
import _optionsSchema from './options.schema.json' with { type: 'json' };
import record from './record.js';
import verifyOptions from './verify-options.js';

const langs = Object.freeze(_langs);
const optionsSchema = deepFreeze(_optionsSchema);

export default Object.freeze({ id, langs, record, optionsSchema, verifyOptions });
