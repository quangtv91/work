import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {ModalComponent} from '../../../../shared/components/modals/modal/modal.component';
import {ManagementRoleService} from '../../../../api/oauth/services/management-role.service';
import {debounceTime} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {TranslateService} from '@ngx-translate/core';

// import {ManagementUserService} from '../../../../api/oauth/services/management-user.service';

@Component({
  selector: 'app-add-user-modal',
  templateUrl: './add-user-modal.component.html',
  styleUrls: ['./add-user-modal.component.scss']
})
export class AddUserModalComponent implements OnInit {
  @Output() inputChange: EventEmitter<string> = new EventEmitter();
  @ViewChild('addUserModal', {
    static: false
  })
  addUserModal: ModalComponent;
  @ViewChild('nameInput', {
    static: false
  })
  nameInputRef: ElementRef<HTMLInputElement>;
  @Input() role: any;
  @Input() action: any;
  @Input() usersAdded: any;
  @Output() userAdded: EventEmitter<boolean> = new EventEmitter();
  @Output() chipRemove: EventEmitter<string> = new EventEmitter();
  @Output() userAddedModel = new EventEmitter<object>();

  username: string;
  isActive = false;
  isShow = false;
  selectedUsers: any[] = [];
  users: any[] = [];

  usersData = [
    {
      username: 'admin',
      lastname: 'admin',
      firstname: 'admin',
      email: 'admin@admin.com',
      phone: '0987654321',
      enable: true
    },
    {
      username: 'quang',
      lastname: 'ta',
      firstname: 'van',
      email: 'quang@admin.com',
      phone: '0987654321',
      enable: true
    },
    {
      username: 'bi',
      lastname: 'bi',
      firstname: 'bi',
      email: 'bi@admin.com',
      phone: '0987654321',
      enable: true
    },
    {
      username: 'gau',
      lastname: 'gau',
      firstname: 'gau',
      email: 'gau@admin.com',
      phone: '0987654321',
      enable: true
    },
    {
      username: 'admin11',
      lastname: 'admin11',
      firstname: 'admin11',
      email: 'admin11@admin.com',
      phone: '0987654321',
      enable: true
    }
  ];

  constructor(
    private toastrService: ToastrService,
    private translateService: TranslateService,
    private managementRoleService: ManagementRoleService
    // private managementUserService: ManagementUserService
  ) {
  }

  ngOnInit() {
    this.reset();
  }

  reset() {
    this.username = '';
  }

  open() {
    this.addUserModal.open();
    setTimeout(() => {
      this.nameInputRef.nativeElement.focus();
    });
    console.log(this.usersAdded);
  }

  close() {
    this.isShow = false;
    this.users = [];
    this.selectedUsers = [];
    this.addUserModal.close();
    this.reset();
  }

  focus() {
    this.nameInputRef.nativeElement.focus();
  }

  handleFocus() {
    this.isActive = true;
    if (this.username !== '') {
      this.isShow = true;
    } else {
      this.searchString();
    }
  }

  handleBlur() {
    this.isActive = false;
    if (this.users.length === 0) {
      this.isShow = false;
    }
  }

  handleCancelButtonClick() {
    this.close();
  }

  handleSubmitButtonClick() {
    if (!this.selectedUsers.length) {
      return;
    }
    if (this.action === 'edit') {
      this.managementRoleService
        .gatekeeperManagementRoleAddUsersToRoleResponse({
          id: this.role.role_id,
          users: this.selectedUsers.join(',')
        })
        .subscribe((_data: any) => {
            this.close();
            this.toastrService.success(
              this.translateService.instant(
                'ROLE_EDIT.NOTI.ADD_USER_TO_ROLE_SUCCESS'
              )
            );
            this.userAdded.emit(true);
          },
          (_error) => {
            console.log(_error);
          }
        );
    } else {
      this.userAddedModel.emit({users: this.selectedUsers});
      this.close();
    }
  }

  searchUserDefaultParams() {
    const searchString = JSON.stringify((this.username ?? '').trim());
    const searchQuery = this.action === 'edit' ? `(username ~ ${searchString})` : `
      (username ~ ${searchString}
        OR firstname ~ ${searchString}
        OR lastname ~ ${searchString}
        OR email ~ ${searchString}
        OR phone ~ ${searchString})`;
    const queryItems: string[] = [];
    if (searchString !== '""') {
      queryItems.push(searchQuery);
    }
    const query = queryItems.join(' AND ');
    return {
      _fields: 'username,firstname,lastname,email,phone,enable,role',
      _sort: 'username',
      ...(query ? {query} : {})
    };
  }

  searchString() {
    this.isShow = true;
    if (this.action === 'edit' && this.username === '') {
      this.users = [];
      this.isShow = false;
      return;
    }
    if (this.action === 'edit') {
      this.managementRoleService
        .gatekeeperManagementRoleGetUsersNotInRole({
          id: this.role.role_id,
          body: {
            _from: this.users.length,
            _size: 20,
            ...this.searchUserDefaultParams()
          }
        })
        .pipe(debounceTime(3000))
        .subscribe(
          (payload: any) => {
            const list = payload.data;
            this.users = list.filter(val => !this.selectedUsers.includes(val));
          },
          (error) => {
            console.log(error);
          }
        );
    } else {
      if (this.usersAdded.length === 0) {
        const mapSelectedUsers = this.selectedUsers.map(user => user.username);
        this.users = this.usersData.filter(user => mapSelectedUsers.indexOf(user.username) === -1);
      } else {
        const mapSelectedUsers = this.selectedUsers.map(user => user.username);
        const mapUsersAdded = this.usersAdded.map(user => user.username);
        this.users = this.usersData.filter(user => ((mapSelectedUsers.indexOf(user.username) === -1) && (mapUsersAdded.indexOf(user.username) === -1)));
      }
      // this.managementUserService
      //   .gatekeeperManagementUserSearch({
      //     _from: 0,
      //     _size: 20,
      //     ...this.searchUserDefaultParams()
      //   })
      //   .pipe(debounceTime(3000))
      //   .subscribe(
      //     (payload: any) => {
      //       const list = payload.data;
      //       this.users = list.filter(user => !this.selectedUsers.includes(user.username));
      //     },
      //     (error) => {
      //       console.log(error);
      //     }
      //   );
    }
  }

  selectedUserItemEdit(username: string) {
    this.selectedUsers.push(username);
    this.users = this.users.filter((val) => !this.selectedUsers.includes(val));
    this.isShow = false;
  }

  removeSelectedUserItemEdit(username: string) {
    this.selectedUsers = this.selectedUsers.filter((e) => e !== username);
    this.users.push(username);
    this.users.sort();
  }

  selectedUserItemAdd(user: any) {
    this.selectedUsers.push(user);
    this.isShow = false;
  }

  removeSelectedUserItemAdd(user: any) {
    this.selectedUsers = this.selectedUsers.filter((e) => e !== user);
    this.users.push(user);
    this.users.sort();
  }
}
