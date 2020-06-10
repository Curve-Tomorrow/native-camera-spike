import { Component, ViewChild, OnInit, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('video')
  public video: ElementRef;

  @ViewChild('canvas')
  public canvas: ElementRef;

  public captures: Array<any>;

  public error: any;

  public constructor() {
    this.captures = [];
  }

  public ngOnInit() {}

  public async ngAfterViewInit() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.video.nativeElement.srcObject = stream;
        this.video.nativeElement.play();
      } else {
        throw new Error('media devices or user media not supported');
      }
    } catch (error) {

      console.error('******');
      console.error(error);
      console.error('******');
      this.error = error;

      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        // required track is missing
        this.error = 'Devices not found';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        // webcam or mic are already in use
        this.error = 'Devices already in use';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        // constraints can not be satisfied by avb. devices
        this.error = 'Constraints not accepted';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // permission denied in browser
        this.error = 'Permission denied';
      } else if (error.name === 'TypeError' || error.name === 'TypeError') {
        // empty constraints object
        this.error = 'Constraints error';
      }
    }
  }

  public capture() {
    const context = this.canvas.nativeElement.getContext('2d').drawImage(this.video.nativeElement, 0, 0, 640, 480);
    this.captures.push(this.canvas.nativeElement.toDataURL('image/png'));
  }
}
