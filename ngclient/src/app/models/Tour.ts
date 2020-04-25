import { StartingPosition } from './Position';

export interface Tour {
    idHash?: string;
    name: string ;
    startPosition: StartingPosition;
    startDateTime: Date;
    guideName?: string;
    guideLink?: string;
    guestHash?: string;
    tourHash?: string;
}
