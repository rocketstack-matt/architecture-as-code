/**
 * Hub UI's CalmService is a thin wrapper around the canonical implementation
 * in @finos/calm-hub-client. The wrapper supplies Hub UI's OIDC-backed
 * getAuthHeaders so existing Hub UI call sites that instantiate
 * `new CalmService()` retain the same auth behaviour.
 */
import axios, { AxiosInstance } from 'axios';
import {
    CalmService as BaseCalmService,
    type AuthHeadersProvider,
} from '@finos/calm-hub-client';
import { getAuthHeaders } from '../authService.js';

const hubAuth: AuthHeadersProvider = { getAuthHeaders };

export class CalmService extends BaseCalmService {
    constructor(axiosInstance?: AxiosInstance) {
        super(axiosInstance ?? axios.create(), hubAuth);
    }
}
