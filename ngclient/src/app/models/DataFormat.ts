export interface DataFormat {
    dataType: DataType;
    body: any;
}

export enum DataType {
    POSITION = 'POS', // lat + lng
    HEADING = 'HEAD' // pitch + heading
}
