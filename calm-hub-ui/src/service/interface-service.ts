import axios, { AxiosInstance } from 'axios';
import {
    InterfaceService as BaseInterfaceService,
    type AuthHeadersProvider,
} from '@finos/calm-hub-client';
import { getAuthHeaders } from '../authService.js';

const hubAuth: AuthHeadersProvider = { getAuthHeaders };

export class InterfaceService extends BaseInterfaceService {
    constructor(axiosInstance?: AxiosInstance) {
        super(axiosInstance ?? axios.create(), hubAuth);
    }
}
