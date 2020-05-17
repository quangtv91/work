import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';

import {ConfirmModalComponent} from '../../../../shared/components/modals/confirm-modal/confirm-modal.component';
import {ManagementPermissionService} from '../../../../api/oauth/services/management-permission.service';
import {InputComponent} from '../../../../shared/components/inputs/input/input.component';
import {SortOrder} from '../../../../shared/components/datatable/datatable/datatable-row/datatable-item/datatable-item.component';
import {UserManagementLayoutComponent} from '../user-management-layout/user-management-layout.component';
import {AddUserModalComponent} from '../add-user-modal/add-user-modal.component';
import {ManagementRoleService} from '../../../../api/oauth/services/management-role.service';
import {ToastrService} from 'ngx-toastr';
import {TranslateService} from '@ngx-translate/core';
import {Location} from '@angular/common';

// import {FilterService} from '../../../../shared/services/filter/filter.service';

export interface PermissionItem {
  id: string;
  count?: number;
  name?: string;
  checked?: boolean;
  permList?: Map<string, any>;
}

export enum PrefixPermission {
  Basic = 'basic_permission',
  Content = 'content_permission',
  System = 'system_permission',
  Tenant = 'user_tenant_permission',
}

@Component({
  selector: 'app-role-add',
  templateUrl: './role-add.component.html',
  styleUrls: ['./role-add.component.scss']
})
export class RoleAddComponent implements OnInit, AfterViewInit {
  @ViewChild('confirmModal', {static: false})
  confirmModalRef: ConfirmModalComponent;
  @ViewChild('nameInput', {static: false})
  nameInput: InputComponent;
  @ViewChild('layout', {static: false})
  layout: UserManagementLayoutComponent;
  @ViewChild('addUserModal', {static: false})
  addUserModalRef: AddUserModalComponent;

  name = '';
  description = '';
  isError = false;
  errorMsgName = '';
  errorMsgDescription = '';

  permissions: PermissionItem[] = [];
  activeTabIndex = 0;
  isChecked = false;

  count = 0;
  selectedManyUser: any;
  searchString = '';
  role: any;
  roles: any[] = [];
  users: any[] = [];
  usersTemp: any[] = [];
  total = 0;
  loading = false;
  loadedAll = false;
  sortedField = 'username';
  sortOrder: SortOrder = SortOrder.ASC;
  checkedAll = false;
  isSearch = false;
  isAscSort = true;

  constructor(
    private router: Router,
    private location: Location,
    private managementRoleService: ManagementRoleService,
    private managementPermissionService: ManagementPermissionService,
    private toastrService: ToastrService,
    private translateService: TranslateService
    // private filterService: FilterService
  ) {
  }

  ngOnInit(): void {
    this.getAvailablePermission();
  }

  ngAfterViewInit() {
    this.nameInput.focus();
  }

  showSelectAll(permissions, tab, key) {
    const items = Object.entries(permissions[tab].permList[key]);
    const filterItems = items.filter(([_key, value]) => value === false);
    return filterItems.length > 0;
  }

  selectDeselectAll(permissions, tab, key, toggle: boolean) {
    const scopes = permissions[tab].permList[key];
    const scopeKeys = Object.keys(scopes);
    for (const scopeKey of scopeKeys) {
      toggle
        ? (scopes[scopeKey] = scopes[scopeKey] === undefined ? undefined : true)
        : (scopes[scopeKey] =
          scopes[scopeKey] === undefined ? undefined : false);
    }
  }

  getAvailablePermission() {
    this.managementPermissionService
      .gatekeeperManagementPermissionGetAvailablePermission()
      .subscribe((_res: any) => {
        if (_res) {
          const perms: any[] = [];
          const permissions = _res ?? [];
          Object.keys(permissions).map((key) => {
            const permission = permissions[key];
            const permissionDetail = permission.detail;
            const permDetails = {};

            Object.keys(permissionDetail).map((k) => {
              permDetails[k] = permissionDetail[k];
            });

            const dataPms = Object.keys(permDetails).map((perm) =>
              perm.split(':')
            );

            const permList = {};
            dataPms.forEach((pms) => {
              const perm = {
                view: undefined,
                edit: undefined,
                create: undefined,
                delete: undefined,
                action: undefined
              };

              let pms1 = pms[1];
              if (key !== PrefixPermission.Basic) {
                const pms1Split = pms[1].split('_');
                pms1 = pms1Split[1];
              }

              const strKey = [pms[0], pms[1]].join(':');

              if (permList[pms[0]]) {
                permList[pms[0]][pms1] = permDetails[strKey];
              } else {
                permList[pms[0]] = perm;

                permList[pms[0]][pms1] = permDetails[strKey];
              }
            });

            perms.push({
              id: key,
              name: permission.name,
              permList,
              count: Object.keys(permList).length
            });
          });
          perms[0].checked = true;
          this.permissions = perms;
        }
      });
  }

  tabChange(tab, index) {
    this.permissions[this.activeTabIndex].checked = false;
    this.activeTabIndex = index;
    this.permissions[this.activeTabIndex].checked = true;
  }

  isFormChanged() {
    return !!(this.name || this.description);
  }

  resetError() {
    this.isError = false;
    this.errorMsgName = '';
    this.errorMsgDescription = '';
  }

  validateFormData() {
    if (this.name === '') {
      this.isError = true;
      this.errorMsgName = 'ROLE_ADD.VALIDATE.NAME.REQUIRED';
    }
    if (this.name && this.name.length > 250) {
      this.isError = true;
      this.errorMsgName = 'ROLE_ADD.VALIDATE.NAME.MAXLENGTH';
    }
    if (this.description && this.description.length > 1024) {
      this.isError = true;
      this.errorMsgDescription = 'ROLE_ADD.VALIDATE.DESCRIPTION.MAXLENGTH';
    }
  }

  submitData() {
    this.resetError();
    this.validateFormData();
    if (this.isError) {
      return;
    }
    const permissions = this.permissions
      .map((perm) => {
        let prefix = '';
        if (perm.id === PrefixPermission.Content) {
          prefix = 'content_';
        }
        if (perm.id === PrefixPermission.System) {
          prefix = 'sys_';
        }
        if (perm.id === PrefixPermission.Tenant) {
          prefix = 'usertenant_';
        }
        return {
          [perm.id]: {
            name: perm.name,
            detail: Object.entries(perm.permList as Record<string, any>)
              .map(([key, scope]: [string, any]) => {
                return Object.entries(scope)
                  .map(([action, value]) => {
                    if (value !== undefined) {
                      return {
                        [key + ':' + prefix + action]: value
                      };
                    }
                  })
                  .reduce((accum, scope) => {
                    return {...accum, ...scope};
                  }, {});
              })
              .reduce((accum, scope) => {
                return {...accum, ...scope};
              }, {})
          }
        };
      })
      .reduce((accum, perm) => {
        return {...accum, ...perm};
      }, {});
    const users = this.users.map(user => user.username).join(',');
    const data = {
      name: this.name,
      description: this.description,
      permissions: permissions,
      users: users
    };
    this.managementRoleService.gatekeeperManagementRoleAddRole(data).subscribe((payload: any) => {
      if (payload) {
        this.location.back();
        this.toastrService.success(
          this.translateService.instant(
            'ROLE_ADD.NOTI.ADD_ROLE_SUCCESS'
          )
        );
      }
    }, (error) => {
      this.toastrService.error(
        this.translateService.instant('ROLE_ADD.NOTI.ADD_ROLE_FAIL')
      );
    });
  }

  // user-list-datatable
  updateSearchString(searchString) {
    this.users = this.usersTemp.filter(user => {
      return user.username.toLowerCase().indexOf(searchString) !== -1 || !searchString;
    });
    this.users.sort((a, b) => (a.username > b.username ? 1 : -1));
    // this.users = this.users.filter(user => user.username.indexOf(searchString) !== -1);
  }

  reloadDatatable(users) {
    this.users = this.users ? [...this.users, ...users] : [];
    this.usersTemp = this.users;
    this.users = this.users.sort((a, b) => (a.username > b.username ? 1 : -1));
    this.total = this.users.length;
  }

  handleSort() {
    this.isAscSort = !this.isAscSort;
    this.isAscSort ? this.users = this.users.sort((a, b) => (a.username > b.username ? 1 : -1)) :
      this.users = this.users.sort((a, b) => (a.username > b.username ? -1 : 1));
  }

  handleCheckItem(username: any) {
    const index = this.users.findIndex((user) => user.username === username);
    const user = this.users[index];
    user.checked = !user.checked;
    const selectedUsers = this.users.filter(user => user.checked === true).map(user => user.username);
    this.count = selectedUsers.length;
  }

  handleCheckAllItem() {
    const toggleCheck = !this.checkedAll;
    this.users = this.users.map((user) => ({...user, checked: toggleCheck}));
    const selectedUsers = this.users.filter(user => user.checked === true).map(user => user.username);
    this.count = selectedUsers.length;
  }

  triggerDeleteEvent(index) {
    this.users = [
      ...this.users.slice(0, index),
      ...this.users.slice(index + 1)
    ];
    this.total = this.users.length;
  }

  triggerDeleteManyEvent() {
    const selectedUsers = this.users.filter(user => user.checked === true).map(user => user.username);
    this.selectedManyUser = selectedUsers;
    if (!selectedUsers.length) {
      return;
    }
    this.users = this.users.filter(user => this.selectedManyUser.indexOf(user.username) === -1);
    this.total = this.users.length;
    this.checkedAll = false;
  }

  handleUserAdded(event) {
    this.reloadDatatable(event.users);
  }

  cancel() {
    if (this.isFormChanged()) {
      this.confirmModalRef.open();
    } else {
      this.router.navigate(['/user-management/roles']);
    }
  }

  modalSubmit() {
    this.confirmModalRef.close();
    this.router.navigate(['/user-management/roles']);
  }

}
