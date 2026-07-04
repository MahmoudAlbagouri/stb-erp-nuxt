<!-- components/employees/OnboardingModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="ob-overlay">
        <div class="ob-panel">
          <!-- ══ Header ══════════════════════════════════════════════════════ -->
          <div class="ob-header">
            <div class="ob-header__title">
              <UserPlus :size="22" class="ob-header__icon" />
              <div>
                <h2>إضافة موظف جديد</h2>
                <p>أكمل الخطوات لإنشاء ملف الموظف الكامل</p>
              </div>
            </div>
            <button class="ob-close" @click="handleClose">
              <X :size="20" />
            </button>
          </div>

          <!-- ══ Tab Bar ═════════════════════════════════════════════════════ -->
          <div class="ob-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="ob-tab"
              :class="{
                'ob-tab--active': activeTab === tab.key,
                'ob-tab--done': isTabDone(tab.key),
                'ob-tab--optional': tab.optional,
              }"
              @click="goTo(tab.key)"
            >
              <span class="ob-tab__icon">
                <component :is="tab.icon" :size="16" />
              </span>
              <span class="ob-tab__label">{{ tab.label }}</span>
              <span v-if="tab.optional" class="ob-tab__badge">اختياري</span>
              <CheckCircle2
                v-if="isTabDone(tab.key)"
                :size="14"
                class="ob-tab__check"
              />
            </button>
          </div>

          <!-- ══ Content ════════════════════════════════════════════════════ -->
          <div class="ob-body">
            <!-- ── تاب 1: بيانات الموظف ──────────────────────────────────── -->
            <div v-show="activeTab === 'employee'" class="ob-section">
              <div class="section-title">
                <User :size="18" />
                <span>البيانات الأساسية للموظف</span>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label required">الاسم الكامل</label>
                  <input
                    v-model="form.employee.fullName"
                    type="text"
                    class="form-input"
                    :class="{ 'form-input--error': errors.fullName }"
                    placeholder="محمد أحمد العمري"
                  />
                  <span v-if="errors.fullName" class="form-error">{{
                    errors.fullName
                  }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label required">الجنسية</label>
                  <select
                    v-model="form.employee.nationalityType"
                    class="form-select"
                  >
                    <option value="" disabled>اختر...</option>
                    <option value="saudi">🇸🇦 سعودي</option>
                    <option value="non_saudi">🌍 غير سعودي</option>
                    <option value="outside_sponsorship">📄 خارج الكفالة</option>
                  </select>
                </div>

                <Transition name="slide-down">
                  <div
                    v-if="form.employee.nationalityType === 'non_saudi'"
                    class="form-group"
                  >
                    <label class="form-label required"
                      >تاريخ انتهاء الهوية</label
                    >
                    <input
                      v-model="form.employee.iqamaExpiryDate"
                      type="date"
                      class="form-input"
                      :class="{ 'form-input--error': errors.iqamaExpiryDate }"
                    />
                    <span v-if="errors.iqamaExpiryDate" class="form-error">{{
                      errors.iqamaExpiryDate
                    }}</span>
                  </div>
                </Transition>

                <div class="form-group">
                  <label class="form-label">رقم الهوية</label>
                  <input
                    v-model="form.employee.nationalId"
                    type="text"
                    class="form-input"
                    :class="{ 'form-input--error': errors.nationalId }"
                    placeholder="1xxxxxxxxx"
                    maxlength="10"
                    @input="
                      form.employee.nationalId =
                        form.employee.nationalId.replace(/[^0-9]/g, '')
                    "
                  />
                  <span v-if="errors.nationalId" class="form-error">{{
                    errors.nationalId
                  }}</span>
                </div>

                <!-- ✅ حقل رفع صورة الهوية -->
                <div class="form-group form-group--full">
                  <label class="form-label">صورة/ملف الهوية</label>
                  <StbUploader
                    :model-value="nationalIdModelValue"
                    @update:model-value="
                      (val) => (tempNationalIdFile = val || '')
                    "
                    endpoint="/media/upload/employee"
                    field-name="files"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    :max-size="5 * 1024 * 1024"
                    idle-title="ارفع صورة الهوية أو ملف PDF"
                    hint="JPG / PNG / PDF — بحد أقصى 5 MB"
                    @error="toast.error"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">المسمى الوظيفي</label>
                  <input
                    v-model="form.employee.jobTitle"
                    type="text"
                    class="form-input"
                    placeholder="مهندس برمجيات أول"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">القسم</label>
                  <input
                    v-model="form.employee.department"
                    type="text"
                    class="form-input"
                    placeholder="تقنية المعلومات"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">رقم الهاتف</label>
                  <input
                    v-model="form.employee.phone"
                    type="tel"
                    class="form-input"
                    :class="{ 'form-input--error': errors.phone }"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    maxlength="10"
                    @input="
                      form.employee.phone = form.employee.phone.replace(
                        /[^0-9]/g,
                        '',
                      )
                    "
                  />
                  <span v-if="errors.phone" class="form-error">{{
                    errors.phone
                  }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label">الحالة الوظيفية</label>
                  <select v-model="form.employee.status" class="form-select">
                    <option value="active">✅ نشط</option>
                    <option value="inactive">⏸ غير نشط</option>
                    <option value="terminated">❌ منتهي الخدمة</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- ── تاب 2: حساب المستخدم ────────────────────────────────── -->
            <div v-show="activeTab === 'user'" class="ob-section">
              <!-- Toggle: هل تريد ربط مستخدم؟ -->
              <div class="toggle-card">
                <div class="toggle-card__info">
                  <ShieldCheck :size="20" class="toggle-card__icon" />
                  <div>
                    <strong>ربط حساب مستخدم</strong>
                    <p>يتيح للموظف تسجيل الدخول والوصول للنظام</p>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input
                    v-model="form.withUser"
                    type="checkbox"
                    @change="onToggleUser"
                  />
                  <span class="toggle-switch__track"></span>
                </label>
              </div>

              <Transition name="slide-down">
                <div v-if="form.withUser" class="user-form-wrapper">
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label required">اسم المستخدم</label>
                      <input
                        v-model="form.user.username"
                        type="text"
                        class="form-input"
                        :class="{ 'form-input--error': errors.username }"
                        placeholder="ahmed.ali"
                        dir="ltr"
                      />
                      <span v-if="errors.username" class="form-error">{{
                        errors.username
                      }}</span>
                    </div>

                    <div class="form-group">
                      <label class="form-label required"
                        >البريد الإلكتروني</label
                      >
                      <input
                        v-model="form.user.email"
                        type="email"
                        class="form-input"
                        :class="{ 'form-input--error': errors.email }"
                        placeholder="ahmed@company.com"
                        dir="ltr"
                      />
                      <span v-if="errors.email" class="form-error">{{
                        errors.email
                      }}</span>
                    </div>

                    <div class="form-group">
                      <label class="form-label required">كلمة المرور</label>
                      <div class="input-with-action">
                        <input
                          v-model="form.user.password"
                          :type="showPassword ? 'text' : 'password'"
                          class="form-input"
                          :class="{ 'form-input--error': errors.password }"
                          placeholder="••••••••"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          class="input-action-btn"
                          @click="showPassword = !showPassword"
                        >
                          <Eye v-if="!showPassword" :size="16" />
                          <EyeOff v-else :size="16" />
                        </button>
                        <button
                          type="button"
                          class="input-action-btn"
                          title="توليد كلمة مرور عشوائية"
                          @click="generatePassword"
                        >
                          <Wand2 :size="16" />
                        </button>
                      </div>
                      <span v-if="errors.password" class="form-error">{{
                        errors.password
                      }}</span>
                    </div>

                    <!-- ─ الدور ─ -->
                    <div class="form-group form-group--full">
                      <label class="form-label">الدور الوظيفي</label>

                      <!-- اختيار: دور موجود أم جديد -->
                      <div class="role-toggle">
                        <button
                          type="button"
                          class="role-toggle__btn"
                          :class="{
                            'role-toggle__btn--active':
                              form.roleMode === 'existing',
                          }"
                          @click="form.roleMode = 'existing'"
                        >
                          <ListChecks :size="15" />
                          اختر دوراً موجوداً
                        </button>
                        <button
                          type="button"
                          class="role-toggle__btn"
                          :class="{
                            'role-toggle__btn--active': form.roleMode === 'new',
                          }"
                          @click="form.roleMode = 'new'"
                        >
                          <Plus :size="15" />
                          إنشاء دور جديد
                        </button>
                        <button
                          type="button"
                          class="role-toggle__btn"
                          :class="{
                            'role-toggle__btn--active':
                              form.roleMode === 'none',
                          }"
                          @click="form.roleMode = 'none'"
                        >
                          <Ban :size="15" />
                          بدون دور
                        </button>
                      </div>

                      <!-- دور موجود -->
                      <Transition name="slide-down">
                        <div v-if="form.roleMode === 'existing'" class="mt-3">
                          <select
                            v-model="form.user.roleId"
                            class="form-select"
                          >
                            <option value="" disabled>اختر الدور...</option>
                            <!-- ✅ تم إضافة displayNameAr هنا -->
                            <option
                              v-for="role in rolesStore.roles"
                              :key="role.id"
                              :value="role.id"
                            >
                              {{ role.displayNameAr || role.name }}
                              <span v-if="role.permissions?.length">
                                ({{ role.permissions.length }} صلاحية)
                              </span>
                            </option>
                          </select>

                          <!-- معاينة صلاحيات الدور المختار -->
                          <div
                            v-if="selectedRolePermissions.length"
                            class="role-preview"
                          >
                            <span class="role-preview__title"
                              >صلاحيات الدور:</span
                            >
                            <div class="role-preview__tags">
                              <span
                                v-for="p in selectedRolePermissions.slice(0, 6)"
                                :key="p.id"
                                class="perm-tag"
                                :title="p.name"
                              >
                                <!-- ✅ عرض الاسم العربي للصلاحيات -->
                                {{ p.displayNameAr || p.name }}
                              </span>
                              <span
                                v-if="selectedRolePermissions.length > 6"
                                class="perm-tag perm-tag--more"
                              >
                                +{{ selectedRolePermissions.length - 6 }} أخرى
                              </span>
                            </div>
                          </div>
                        </div>
                      </Transition>

                      <!-- دور جديد -->
                      <Transition name="slide-down">
                        <div v-if="form.roleMode === 'new'" class="mt-3">
                          <div class="form-group">
                            <label class="form-label required"
                              >اسم الدور الجديد</label
                            >
                            <input
                              v-model="form.user.roleName"
                              type="text"
                              class="form-input"
                              :class="{
                                'form-input--error': errors.roleName,
                              }"
                              placeholder="مثال: مشرف المبيعات"
                            />
                            <span v-if="errors.roleName" class="form-error">{{
                              errors.roleName
                            }}</span>
                          </div>

                          <!-- اختيار الصلاحيات -->
                          <div class="form-group">
                            <label class="form-label"
                              >صلاحيات الدور
                              <span class="label-count"
                                >({{
                                  form.user.permissionIds?.length ?? 0
                                }}
                                محددة)</span
                              ></label
                            >

                            <div class="perm-search">
                              <Search :size="14" />
                              <input
                                v-model="permSearch"
                                type="text"
                                placeholder="بحث في الصلاحيات..."
                              />
                            </div>

                            <!-- ✅ تحسين عرض الصلاحيات (عربي + تقني) -->
                            <div class="perm-grid">
                              <label
                                v-for="perm in filteredPermissions"
                                :key="perm.id"
                                class="perm-checkbox"
                                :class="{
                                  'perm-checkbox--checked':
                                    form.user.permissionIds?.includes(perm.id),
                                }"
                              >
                                <input
                                  type="checkbox"
                                  :value="perm.id"
                                  v-model="form.user.permissionIds"
                                />
                                <div class="perm-label-content">
                                  <span class="perm-name-ar">{{
                                    perm.displayNameAr || perm.name
                                  }}</span>
                                  <small class="perm-tech-name">{{
                                    perm.name
                                  }}</small>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </Transition>

                      <Transition name="slide-down">
                        <div v-if="form.roleMode === 'none'" class="mt-3">
                          <div class="info-note">
                            <Info :size="15" />
                            <span
                              >سيتم إنشاء المستخدم بدون صلاحيات. يمكن تعيين دور
                              لاحقاً من صفحة المستخدمين.</span
                            >
                          </div>
                        </div>
                      </Transition>
                    </div>
                  </div>
                </div>
              </Transition>

              <div v-if="!form.withUser" class="skip-note">
                <UserX :size="36" class="skip-note__icon" />
                <p>
                  سيتم إنشاء الموظف <strong>بدون حساب مستخدم</strong>. يمكنك
                  إضافة حساب لاحقاً.
                </p>
              </div>
            </div>

            <!-- ── تاب 3: العقد ─────────────────────────────────────────── -->
            <div v-show="activeTab === 'contract'" class="ob-section">
              <div class="toggle-card">
                <div class="toggle-card__info">
                  <FileText :size="20" class="toggle-card__icon" />
                  <div>
                    <strong>إنشاء عقد عمل</strong>
                    <p>تحديد نوع العقد ومدته وعدد أيام الإجازة</p>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input v-model="form.withContract" type="checkbox" />
                  <span class="toggle-switch__track"></span>
                </label>
              </div>

              <Transition name="slide-down">
                <div v-if="form.withContract" class="form-grid mt-4">
                  <div class="form-group">
                    <label class="form-label required">نوع العقد</label>
                    <select
                      v-model="form.contract.contractType"
                      class="form-select"
                    >
                      <option value="" disabled>اختر النوع...</option>
                      <option value="دائم">دائم</option>
                      <option value="جزئي">جزئي (Part-Time)</option>
                      <option value="مرن">مرن (Flexible)</option>
                      <option value="عن بعد">عن بعد (Remote)</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <!-- ✅ حقل مدة العقد الجديد -->
                  <div class="form-group">
                    <label class="form-label">مدة العقد (بالسنوات)</label>
                    <input
                      v-model.number="form.contract.contractDurationYears"
                      type="number"
                      min="1"
                      class="form-input"
                      placeholder="مثال: 2"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label required">تاريخ بداية العقد</label>
                    <input
                      v-model="form.contract.startDate"
                      type="date"
                      class="form-input"
                      :class="{ 'form-input--error': errors.startDate }"
                    />
                    <span v-if="errors.startDate" class="form-error">{{
                      errors.startDate
                    }}</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label"
                      >تاريخ نهاية العقد
                      <span class="label-optional"
                        >(للعقود المؤقتة)</span
                      ></label
                    >
                    <input
                      v-model="form.contract.endDate"
                      type="date"
                      class="form-input"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">أيام الإجازة السنوية</label>
                    <div class="number-stepper">
                      <button
                        type="button"
                        @click="
                          form.contract.annualLeaveDays = Math.max(
                            0,
                            (form.contract.annualLeaveDays ?? 30) - 1,
                          )
                        "
                      >
                        <Minus :size="14" />
                      </button>
                      <input
                        v-model.number="form.contract.annualLeaveDays"
                        type="number"
                        min="0"
                        max="365"
                        class="form-input"
                      />
                      <button
                        type="button"
                        @click="
                          form.contract.annualLeaveDays =
                            (form.contract.annualLeaveDays ?? 30) + 1
                        "
                      >
                        <Plus :size="14" />
                      </button>
                    </div>
                  </div>

                  <!-- ✅ حقل رفع مرفق العقد -->
                  <div class="form-group form-group--full">
                    <label class="form-label">مرفق العقد</label>
                    <StbUploader
                      :model-value="contractFilesModelValue"
                      @update:model-value="handleContractFilesUpdate"
                      endpoint="/media/upload/contract"
                      field-name="files"
                      accept=".pdf,.doc,.docx,image/*"
                      :max-size="10 * 1024 * 1024"
                      idle-title="ارفع صورة أو ملف PDF للعقد"
                      hint="PDF / Word / Images — بحد أقصى 10 MB"
                      multiple
                      @error="toast.error"
                    />
                  </div>

                  <div class="form-group form-group--full">
                    <label class="form-label">ملاحظات العقد</label>
                    <textarea
                      v-model="form.contract.notes"
                      class="form-textarea"
                      placeholder="أي شروط أو ملاحظات خاصة بهذا العقد..."
                      rows="3"
                    ></textarea>
                  </div>
                </div>
              </Transition>

              <div v-if="!form.withContract" class="skip-note">
                <FileX :size="36" class="skip-note__icon" />
                <p>
                  سيتم إنشاء الموظف <strong>بدون عقد</strong>. يمكن إضافة عقد
                  لاحقاً من صفحة العقود.
                </p>
              </div>
            </div>

            <!-- ── تاب 4: الراتب ──────────────────────────────────────── -->
            <div v-show="activeTab === 'salary'" class="ob-section">
              <div class="toggle-card">
                <div class="toggle-card__info">
                  <Banknote :size="20" class="toggle-card__icon" />
                  <div>
                    <strong>تحديد الراتب</strong>
                    <p>الراتب الأساسي والبدلات</p>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input v-model="form.withSalary" type="checkbox" />
                  <span class="toggle-switch__track"></span>
                </label>
              </div>

              <Transition name="slide-down">
                <div v-if="form.withSalary" class="mt-4">
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label required">الراتب الأساسي</label>
                      <div class="input-with-suffix">
                        <input
                          v-model.number="form.salary.basicSalary"
                          type="number"
                          min="0"
                          class="form-input"
                          :class="{
                            'form-input--error': errors.basicSalary,
                          }"
                          placeholder="0"
                          dir="ltr"
                        />
                        <span class="input-suffix">ر.س</span>
                      </div>
                      <span v-if="errors.basicSalary" class="form-error">{{
                        errors.basicSalary
                      }}</span>
                    </div>

                    <div class="form-group">
                      <label class="form-label">بدل السكن</label>
                      <div class="input-with-suffix">
                        <input
                          v-model.number="form.salary.housingAllowance"
                          type="number"
                          min="0"
                          class="form-input"
                          placeholder="0"
                          dir="ltr"
                        />
                        <span class="input-suffix">ر.س</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">بدل النقل</label>
                      <div class="input-with-suffix">
                        <input
                          v-model.number="form.salary.transportAllowance"
                          type="number"
                          min="0"
                          class="form-input"
                          placeholder="0"
                          dir="ltr"
                        />
                        <span class="input-suffix">ر.س</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">بدلات أخرى</label>
                      <div class="input-with-suffix">
                        <input
                          v-model.number="form.salary.otherAllowances"
                          type="number"
                          min="0"
                          class="form-input"
                          placeholder="0"
                          dir="ltr"
                        />
                        <span class="input-suffix">ر.س</span>
                      </div>
                    </div>
                  </div>

                  <!-- ملخص الراتب -->
                  <div class="salary-summary">
                    <div class="salary-summary__title">ملخص الراتب الشهري</div>
                    <div class="salary-summary__rows">
                      <div class="salary-row">
                        <span>الراتب الأساسي</span>
                        <span>{{ fmt(form.salary.basicSalary) }} ر.س</span>
                      </div>
                      <div
                        v-if="form.salary.housingAllowance"
                        class="salary-row"
                      >
                        <span>بدل السكن</span>
                        <span
                          >+ {{ fmt(form.salary.housingAllowance) }} ر.س</span
                        >
                      </div>
                      <div
                        v-if="form.salary.transportAllowance"
                        class="salary-row"
                      >
                        <span>بدل النقل</span>
                        <span
                          >+ {{ fmt(form.salary.transportAllowance) }} ر.س</span
                        >
                      </div>
                      <div
                        v-if="form.salary.otherAllowances"
                        class="salary-row"
                      >
                        <span>بدلات أخرى</span>
                        <span
                          >+ {{ fmt(form.salary.otherAllowances) }} ر.س</span
                        >
                      </div>
                      <div class="salary-row salary-row--total">
                        <span>الإجمالي</span>
                        <span>{{ fmt(totalSalary) }} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>

              <div v-if="!form.withSalary" class="skip-note">
                <WalletCards :size="36" class="skip-note__icon" />
                <p>
                  سيتم إنشاء الموظف <strong>بدون راتب محدد</strong>. يمكن إضافة
                  الراتب لاحقاً من صفحة الرواتب.
                </p>
              </div>
            </div>

            <!-- ── تاب 5: مراجعة ─────────────────────────────────────── -->
            <div v-show="activeTab === 'review'" class="ob-section">
              <div class="review-grid">
                <!-- بيانات الموظف -->
                <div class="review-card">
                  <div class="review-card__header">
                    <User :size="16" />
                    <span>بيانات الموظف</span>
                    <button class="review-edit-btn" @click="goTo('employee')">
                      <Pencil :size="13" /> تعديل
                    </button>
                  </div>
                  <div class="review-rows">
                    <div class="review-row">
                      <span>الاسم</span>
                      <strong>{{ form.employee.fullName || "—" }}</strong>
                    </div>
                    <div class="review-row">
                      <span>الجنسية</span>
                      <strong>{{
                        nationalityLabel(form.employee.nationalityType)
                      }}</strong>
                    </div>
                    <div v-if="form.employee.jobTitle" class="review-row">
                      <span>المسمى</span>
                      <strong>{{ form.employee.jobTitle }}</strong>
                    </div>
                    <div v-if="form.employee.department" class="review-row">
                      <span>القسم</span>
                      <strong>{{ form.employee.department }}</strong>
                    </div>
                  </div>
                </div>

                <!-- المستخدم -->
                <div class="review-card">
                  <div class="review-card__header">
                    <ShieldCheck :size="16" />
                    <span>حساب المستخدم</span>
                    <button class="review-edit-btn" @click="goTo('user')">
                      <Pencil :size="13" /> تعديل
                    </button>
                  </div>
                  <div v-if="form.withUser" class="review-rows">
                    <div class="review-row">
                      <span>المستخدم</span>
                      <strong>{{ form.user.username }}</strong>
                    </div>
                    <div class="review-row">
                      <span>البريد</span>
                      <strong>{{ form.user.email }}</strong>
                    </div>
                    <div class="review-row">
                      <span>الدور</span>
                      <strong>{{
                        form.roleMode === "existing"
                          ? (rolesStore.roles.find(
                              (r) => r.id === form.user.roleId,
                            )?.name ?? "—")
                          : form.roleMode === "new"
                            ? form.user.roleName || "—"
                            : "بدون دور"
                      }}</strong>
                    </div>
                  </div>
                  <div v-else class="review-skip">
                    <span>بدون حساب مستخدم</span>
                  </div>
                </div>

                <!-- العقد -->
                <div class="review-card">
                  <div class="review-card__header">
                    <FileText :size="16" />
                    <span>عقد العمل</span>
                    <button class="review-edit-btn" @click="goTo('contract')">
                      <Pencil :size="13" /> تعديل
                    </button>
                  </div>
                  <div v-if="form.withContract" class="review-rows">
                    <div class="review-row">
                      <span>نوع العقد</span>
                      <strong>{{ form.contract.contractType }}</strong>
                    </div>
                    <div class="review-row">
                      <span>المدة</span>
                      <strong>{{
                        form.contract.contractDurationYears
                          ? form.contract.contractDurationYears + " سنوات"
                          : "غير محدد"
                      }}</strong>
                    </div>
                    <div class="review-row">
                      <span>تاريخ البداية</span>
                      <strong>{{ form.contract.startDate }}</strong>
                    </div>
                    <div class="review-row">
                      <span>أيام الإجازة</span>
                      <strong>{{ form.contract.annualLeaveDays }} يوم</strong>
                    </div>
                  </div>
                  <div v-else class="review-skip">
                    <span>بدون عقد</span>
                  </div>
                </div>

                <!-- الراتب -->
                <div class="review-card">
                  <div class="review-card__header">
                    <Banknote :size="16" />
                    <span>الراتب</span>
                    <button class="review-edit-btn" @click="goTo('salary')">
                      <Pencil :size="13" /> تعديل
                    </button>
                  </div>
                  <div v-if="form.withSalary" class="review-rows">
                    <div class="review-row">
                      <span>الراتب الأساسي</span>
                      <strong>{{ fmt(form.salary.basicSalary) }} ر.س</strong>
                    </div>
                    <div class="review-row review-row--total">
                      <span>الإجمالي</span>
                      <strong>{{ fmt(totalSalary) }} ر.س</strong>
                    </div>
                  </div>
                  <div v-else class="review-skip">
                    <span>بدون راتب محدد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ Footer ══════════════════════════════════════════════════════ -->
          <div class="ob-footer">
            <button
              v-if="activeTab !== 'employee'"
              class="btn btn--ghost"
              @click="prevTab"
            >
              <ChevronRight :size="16" />
              السابق
            </button>
            <div v-else></div>

            <div class="ob-footer__steps">
              <span
                v-for="(tab, i) in tabs"
                :key="tab.key"
                class="step-dot"
                :class="{
                  'step-dot--active': activeTab === tab.key,
                  'step-dot--done': isTabDone(tab.key),
                }"
                @click="goTo(tab.key)"
              />
            </div>

            <button
              v-if="activeTab !== 'review'"
              class="btn btn--primary"
              @click="nextTab"
            >
              التالي
              <ChevronLeft :size="16" />
            </button>

            <button
              v-else
              class="btn btn--success"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="spinner spinner--sm" />
              <CheckCircle2 v-else :size="17" />
              {{ submitting ? "جاري الحفظ..." : "إنشاء الموظف" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import {
  UserPlus,
  X,
  User,
  ShieldCheck,
  FileText,
  Banknote,
  ClipboardList,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Wand2,
  Search,
  Plus,
  Minus,
  Pencil,
  Info,
  Ban,
  ListChecks,
  UserX,
  FileX,
  WalletCards,
} from "lucide-vue-next";

// استيراد مكون الرفع
import StbUploader from "@/components/global/StbUploader.vue";

import { useEmployeesStore } from "@/stores/employees";
import { useRolesStore } from "@/stores/roles";
import { usePermissionsStore } from "@/stores/permissions";
import { useToast } from "@/composables/useToast";

// ── Props / Emits ────────────────────────────────────────────────────────────
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [boolean];
  created: [result: any];
}>();

const employeesStore = useEmployeesStore();
const rolesStore = useRolesStore();
const permissionsStore = usePermissionsStore();
const toast = useToast();

// ── Tabs ────────────────────────────────────────────────────────────────────
type TabKey = "employee" | "user" | "contract" | "salary" | "review";

const tabs = [
  { key: "employee" as TabKey, label: "الموظف", icon: User },
  {
    key: "user" as TabKey,
    label: "المستخدم",
    icon: ShieldCheck,
    optional: true,
  },
  { key: "contract" as TabKey, label: "العقد", icon: FileText, optional: true },
  { key: "salary" as TabKey, label: "الراتب", icon: Banknote, optional: true },
  { key: "review" as TabKey, label: "مراجعة", icon: ClipboardList },
];

const tabOrder: TabKey[] = tabs.map((t) => t.key);
const activeTab = ref<TabKey>("employee");

const doneTabs = ref<Set<TabKey>>(new Set());
const isTabDone = (key: TabKey) => doneTabs.value.has(key);

const goTo = (key: TabKey) => {
  activeTab.value = key;
};

const nextTab = () => {
  const idx = tabOrder.indexOf(activeTab.value);
  if (validateCurrentTab()) {
    doneTabs.value.add(activeTab.value);
    if (idx < tabOrder.length - 1) activeTab.value = tabOrder[idx + 1];
  }
};

const prevTab = () => {
  const idx = tabOrder.indexOf(activeTab.value);
  if (idx > 0) activeTab.value = tabOrder[idx - 1];
};

// ── Form State ────────────────────────────────────────────────────────────────
const form = reactive({
  // toggle flags
  withUser: false,
  withContract: false,
  withSalary: false,
  roleMode: "none" as "existing" | "new" | "none",

  employee: {
    fullName: "",
    nationalityType: "" as "saudi" | "non_saudi" | "outside_sponsorship" | "",
    iqamaExpiryDate: "",
    nationalId: "",
    nationalIdCardPath: "",
    phone: "",
    jobTitle: "",
    department: "",
    status: "active" as "active" | "inactive" | "terminated",
  },

  user: {
    username: "",
    email: "",
    password: "",
    roleId: "",
    roleName: "",
    permissionIds: [] as string[],
  },

  contract: {
    contractType: "" as string,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    annualLeaveDays: 30,
    contractDurationYears: 1, // ✅ القيمة الافتراضية
    notes: "",
    attachmentPaths: [] as string[],
  },

  salary: {
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowances: 0,
  },
});

const errors = reactive<Record<string, string>>({});
const submitting = ref(false);
const showPassword = ref(false);
const permSearch = ref("");

// متغيرات مؤقتة لملفات الرفع
const tempNationalIdFile = ref<string>("");
const tempContractFiles = ref<string[]>([]);

// ✅ Computed Properties لحل مشكلة نوع الـ Uploader (string vs string[])
const nationalIdModelValue = computed(() => {
  return tempNationalIdFile.value || undefined;
});

const contractFilesModelValue = computed(() => {
  return tempContractFiles.value.length > 0
    ? tempContractFiles.value.join(",")
    : undefined;
});

// Handlers لتحديث المتغيرات المؤقتة عند تغيير القيمة من الـ Uploader
const handleContractFilesUpdate = (val: string) => {
  if (!val) {
    tempContractFiles.value = [];
  } else {
    tempContractFiles.value = val.split(",").filter(Boolean);
  }
};

// Watchers إضافية للربط المباشر
watch(tempNationalIdFile, (val) => {
  form.employee.nationalIdCardPath = val;
});

watch(tempContractFiles, (val) => {
  form.contract.attachmentPaths = val;
});

// ── Computed ──────────────────────────────────────────────────────────────────
const totalSalary = computed(
  () =>
    Number(form.salary.basicSalary || 0) +
    Number(form.salary.housingAllowance || 0) +
    Number(form.salary.transportAllowance || 0) +
    Number(form.salary.otherAllowances || 0),
);

const selectedRolePermissions = computed(() => {
  if (!form.user.roleId) return [];
  const role = rolesStore.roles.find((r) => r.id === form.user.roleId);
  return role?.permissions ?? [];
});

const filteredPermissions = computed(() => {
  const q = permSearch.value.toLowerCase();
  if (!q) return permissionsStore.permissions;
  return permissionsStore.permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.displayNameAr && p.displayNameAr.toLowerCase().includes(q)),
  );
});

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      // جلب البيانات عند فتح المودال
      rolesStore.fetchAll();
      permissionsStore.fetchAll();
    }
  },
);

// ── Toggle User Handler ───────────────────────────────────────────────────────
const onToggleUser = () => {
  if (!form.withUser) {
    form.roleMode = "none";
    form.user.roleId = "";
    form.user.roleName = "";
    form.user.permissionIds = [];
  }
};

// ── Validation ────────────────────────────────────────────────────────────────
const clearErrors = () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
};

const validateCurrentTab = (): boolean => {
  clearErrors();

  if (activeTab.value === "employee") {
    if (!form.employee.fullName.trim()) {
      errors.fullName = "الاسم الكامل مطلوب";
      return false;
    }
    if (!form.employee.nationalityType) {
      errors.nationalityType = "نوع الجنسية مطلوب";
      return false;
    }
    if (
      form.employee.nationalityType === "non_saudi" &&
      !form.employee.iqamaExpiryDate
    ) {
      errors.iqamaExpiryDate = "تاريخ انتهاء الهوية مطلوب لغير السعوديين";
      return false;
    }
  }

  if (activeTab.value === "user" && form.withUser) {
    if (!form.user.username.trim()) {
      errors.username = "اسم المستخدم مطلوب";
      return false;
    }
    if (!form.user.email || !/\S+@\S+\.\S+/.test(form.user.email)) {
      errors.email = "بريد إلكتروني غير صالح";
      return false;
    }
    if (!form.user.password || form.user.password.length < 8) {
      errors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
      return false;
    }
    if (form.roleMode === "new" && !form.user.roleName.trim()) {
      errors.roleName = "اسم الدور مطلوب";
      return false;
    }
  }

  if (activeTab.value === "contract" && form.withContract) {
    if (!form.contract.startDate) {
      errors.startDate = "تاريخ بداية العقد مطلوب";
      return false;
    }
  }

  if (activeTab.value === "salary" && form.withSalary) {
    if (!form.salary.basicSalary || form.salary.basicSalary <= 0) {
      errors.basicSalary = "الراتب الأساسي يجب أن يكون أكبر من صفر";
      return false;
    }
  }

  return true;
};

// ── Password Generator ────────────────────────────────────────────────────────
const generatePassword = () => {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  form.user.password = Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  showPassword.value = true;
};

// ── Close Modal & Reset Form ────────────────────────────────────────────────
const handleClose = () => {
  // إغلاق المودال بصرياً فوراً
  emit("update:modelValue", false);

  // تصفير البيانات بعد انتهاء الأنيميشن (300ms)
  setTimeout(() => {
    activeTab.value = "employee";
    doneTabs.value.clear();
    clearErrors();

    // تصفير المتغيرات المؤقتة للرفع
    tempNationalIdFile.value = "";
    tempContractFiles.value = [];

    Object.assign(form, {
      withUser: false,
      withContract: false,
      withSalary: false,
      roleMode: "none",
      employee: {
        fullName: "",
        nationalityType: "" as
          | "saudi"
          | "non_saudi"
          | "outside_sponsorship"
          | "",
        iqamaExpiryDate: "",
        nationalId: "",
        nationalIdCardPath: "",
        phone: "",
        jobTitle: "",
        department: "",
        status: "active" as "active" | "inactive" | "terminated",
      },
      user: {
        username: "",
        email: "",
        password: "",
        roleId: "",
        roleName: "",
        permissionIds: [] as string[],
      },
      contract: {
        contractType: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        annualLeaveDays: 30,
        contractDurationYears: 1, // ✅ إعادة التعيين للافتراضي
        notes: "",
        attachmentPaths: [] as string[],
      },
      salary: {
        basicSalary: 0,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
      },
    });
  }, 300);
};

// ── Submit Onboarding ───────────────────────────────────────────────────────
const handleSubmit = async () => {
  clearErrors();
  submitting.value = true;

  try {
    const payload: any = {
      fullName: form.employee.fullName,
      nationalityType: form.employee.nationalityType,
      nationalId: form.employee.nationalId || undefined,
      nationalIdCardPath: form.employee.nationalIdCardPath || undefined,
      phone: form.employee.phone || undefined,
      jobTitle: form.employee.jobTitle || undefined,
      department: form.employee.department || undefined,
      status: form.employee.status,
    };

    if (
      form.employee.nationalityType === "non_saudi" &&
      form.employee.iqamaExpiryDate
    ) {
      payload.iqamaExpiryDate = form.employee.iqamaExpiryDate;
    }

    if (form.withUser) {
      payload.user = {
        username: form.user.username,
        email: form.user.email,
        password: form.user.password,
      };

      if (form.roleMode === "existing" && form.user.roleId) {
        payload.user.roleId = form.user.roleId;
      } else if (form.roleMode === "new" && form.user.roleName) {
        payload.user.roleName = form.user.roleName;
        if (form.user.permissionIds.length) {
          payload.user.permissionIds = form.user.permissionIds;
        }
      }
    }

    if (form.withContract && form.contract.contractType) {
      payload.contract = {
        contractType: form.contract.contractType,
        startDate: form.contract.startDate,
        endDate: form.contract.endDate || undefined,
        annualLeaveDays: form.contract.annualLeaveDays,
        contractDurationYears: form.contract.contractDurationYears, // ✅ إرسال المدة
        notes: form.contract.notes || undefined,
        attachmentPaths: form.contract.attachmentPaths,
      };
    }

    if (form.withSalary && form.salary.basicSalary > 0) {
      payload.salary = {
        basicSalary: form.salary.basicSalary,
        housingAllowance: form.salary.housingAllowance || 0,
        transportAllowance: form.salary.transportAllowance || 0,
        otherAllowances: form.salary.otherAllowances || 0,
      };
    }

    const { useApi } = await import("@/composables/useApi");
    const api = useApi();
    const res = await api.post<any>("/employees/onboard", payload);

    employeesStore.employees.unshift(res.data.employee);
    toast.success(`تم إنشاء ملف الموظف "${form.employee.fullName}" بنجاح ✅`);
    emit("created", res.data);

    // ✅ الإغلاق المباشر هنا يضمن اختفاء الـ Overlay فور النجاح
    handleClose();
  } catch (e: any) {
    toast.error(e.message || "فشل في إنشاء الموظف");
  } finally {
    // تصفير حالة الإرسال فقط دون التأثير على حالة المودال
    submitting.value = false;
  }
};
// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  (n || 0).toLocaleString("ar-SA", { maximumFractionDigits: 0 });

const nationalityLabel = (type: string) => {
  const map: Record<string, string> = {
    saudi: "🇸 سعودي",
    non_saudi: "🌍 غير سعودي",
    outside_sponsorship: "📄 خارج الكفالة",
  };
  return map[type] ?? "—";
};
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ══ Overlay / Panel ══════════════════════════════════════════════════════════
.ob-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;
}

.ob-panel {
  background: $stb-surface;
  border: 1px solid $stb-border;
  border-radius: $radius-xl;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

// ══ Header ═══════════════════════════════════════════════════════════════════
.ob-header {
  @include flex(row, center, space-between);
  padding: $space-4 $space-5;
  border-bottom: 1px solid $stb-border;
  background: $stb-surface-2;

  &__title {
    @include flex(row, center, flex-start, $space-4);

    h2 {
      font-size: $font-size-lg;
      font-weight: 700;
      margin: 0;
    }

    p {
      font-size: $font-size-xs;
      color: $stb-text-muted;
      margin: 0;
    }
  }

  &__icon {
    color: $stb-accent;
    flex-shrink: 0;
  }
}

.ob-close {
  @include flex(row, center, center);
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  border: none;
  background: transparent;
  color: $stb-text-muted;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $stb-surface-3;
    color: $stb-text-primary;
  }
}

// ══ Tabs ══════════════════════════════════════════════════════════════════════
.ob-tabs {
  display: flex;
  padding: 0 $space-5;
  border-bottom: 1px solid $stb-border;
  background: $stb-surface-2;
  gap: 2px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
}

.ob-tab {
  @include flex(row, center, center, $space-2);
  padding: $space-4 $space-4;
  border: none;
  background: transparent;
  color: $stb-text-muted;
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: all $transition-fast;
  position: relative;

  &:hover:not(.ob-tab--active) {
    color: $stb-text-secondary;
    background: rgba($stb-accent, 0.04);
  }

  &--active {
    color: $stb-accent;
    border-bottom-color: $stb-accent;
    background: rgba($stb-accent, 0.06);
  }

  &--done:not(.ob-tab--active) {
    color: $stb-success;
  }

  &__icon {
    @include flex(row, center, center);
    opacity: 0.7;
  }

  &__badge {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: $radius-sm;
    background: rgba($stb-accent, 0.15);
    color: $stb-accent;
    font-weight: 600;
  }

  &__check {
    color: $stb-success;
    flex-shrink: 0;
  }
}

// ══ Body ═════════════════════════════════════════════════════════════════════
.ob-body {
  flex: 1;
  overflow-y: auto;
  padding: $space-5;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: $stb-border;
    border-radius: 4px;
  }
}

.ob-section {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.section-title {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;
  font-weight: 700;
  color: $stb-text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: $space-4;
  border-bottom: 1px solid $stb-border;
  margin-bottom: $space-2;
}

// ══ Form Grid ════════════════════════════════════════════════════════════════
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;

  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;

  &--full {
    grid-column: span 2;

    @include respond-to("md") {
      grid-column: span 1;
    }
  }
}

.form-label {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-secondary;

  &.required::after {
    content: " *";
    color: $stb-danger;
  }
}

.label-optional {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  font-weight: 400;
}

.label-count {
  font-size: $font-size-xs;
  color: $stb-accent;
  font-weight: 400;
}

.form-error {
  font-size: $font-size-xs;
  color: $stb-danger;
}

.form-input--error {
  border-color: $stb-danger !important;
}

// ══ Toggle Card ═══════════════════════════════════════════════════════════════
.toggle-card {
  @include flex(row, center, space-between);
  padding: $space-4;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;

  &__info {
    @include flex(row, center, flex-start, $space-3);

    strong {
      display: block;
      font-size: $font-size-sm;
      font-weight: 700;
    }

    p {
      font-size: $font-size-xs;
      color: $stb-text-muted;
      margin: 0;
    }
  }

  &__icon {
    color: $stb-accent;
    flex-shrink: 0;
  }
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  &__track {
    position: absolute;
    inset: 0;
    background: $stb-surface-3;
    border-radius: 24px;
    border: 1px solid $stb-border;
    transition: all $transition-base;

    &::before {
      content: "";
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: $stb-text-muted;
      top: 2px;
      right: 2px; // RTL
      transition: all $transition-base;
    }
  }

  input:checked + .toggle-switch__track {
    background: $stb-accent;
    border-color: $stb-accent;

    &::before {
      background: #fff;
      right: calc(100% - 20px);
    }
  }
}

// ══ Role Toggle ═══════════════════════════════════════════════════════════════
.role-toggle {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;

  &__btn {
    @include flex(row, center, center, $space-1);
    padding: $space-2 $space-3;
    border-radius: $radius-md;
    border: 1px solid $stb-border;
    background: transparent;
    color: $stb-text-muted;
    font-size: $font-size-xs;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      border-color: $stb-accent;
      color: $stb-accent;
    }

    &--active {
      background: rgba($stb-accent, 0.12);
      border-color: $stb-accent;
      color: $stb-accent;
    }
  }
}

// ══ Role Preview ══════════════════════════════════════════════════════════════
.role-preview {
  margin-top: $space-3;
  padding: $space-3;
  background: rgba($stb-accent, 0.05);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;

  &__title {
    font-size: $font-size-xs;
    color: $stb-text-muted;
    margin-bottom: $space-2;
    font-weight: 600;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }
}

.perm-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: $radius-sm;
  background: rgba($stb-accent, 0.1);
  color: $stb-accent;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;

  &--more {
    background: rgba($stb-text-muted, 0.1);
    color: $stb-text-muted;
  }
}

// ══ Permissions Grid ══════════════════════════════════════════════════════════
.perm-search {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  background: $stb-surface-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  margin-bottom: $space-3;
  color: $stb-text-muted;

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: $stb-text-primary;
    font-size: $font-size-sm;
  }
}

.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: $space-2;
  max-height: 220px;
  overflow-y: auto;
  padding: $space-1;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: $stb-border;
    border-radius: 4px;
  }
}

.perm-checkbox {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  border: 1px solid $stb-border;
  font-size: $font-size-xs;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  color: $stb-text-secondary;
  align-items: flex-start; // لمحاذاة المحتوى مع الـ checkbox من الأعلى

  input {
    accent-color: $stb-accent;
    flex-shrink: 0;
    margin-top: 3px; // محاذاة بصرية مع النص
  }

  &--checked {
    background: rgba($stb-accent, 0.08);
    border-color: rgba($stb-accent, 0.4);
    color: $stb-accent;
  }

  &:hover:not(.perm-checkbox--checked) {
    border-color: $stb-accent;
  }
}

// ✅ تنسيقات جديدة لعرض الصلاحيات (عربي + تقني)
.perm-label-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.perm-name-ar {
  font-weight: 600;
  color: $stb-text-primary;
  font-size: $font-size-xs;
}

.perm-tech-name {
  font-family: monospace;
  font-size: 10px;
  color: $stb-text-muted;
  opacity: 0.8;
  direction: ltr;
  text-align: right;
}

// ══ Number Stepper ════════════════════════════════════════════════════════════
.number-stepper {
  @include flex(row, stretch, flex-start);
  gap: 0;

  input {
    text-align: center;
    border-radius: 0;
    flex: 1;
    min-width: 0;
  }

  button {
    @include flex(row, center, center);
    width: 38px;
    flex-shrink: 0;
    border: 1px solid $stb-border;
    background: $stb-surface-2;
    color: $stb-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:first-child {
      border-radius: 0 $radius-md $radius-md 0; // RTL
    }

    &:last-child {
      border-radius: $radius-md 0 0 $radius-md;
    }

    &:hover {
      background: $stb-accent;
      color: #fff;
      border-color: $stb-accent;
    }
  }
}

// ══ Input with suffix ════════════════════════════════════════════════════════
.input-with-suffix {
  position: relative;

  input {
    padding-left: 44px;
  }
}

.input-suffix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: $font-size-xs;
  font-weight: 700;
  color: $stb-text-muted;
  pointer-events: none;
}

.input-with-action {
  display: flex;
  gap: $space-2;

  input {
    flex: 1;
    min-width: 0;
  }
}

.input-action-btn {
  @include flex(row, center, center);
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface-2;
  color: $stb-text-muted;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $stb-accent;
    color: $stb-accent;
    background: rgba($stb-accent, 0.08);
  }
}

// ══ Salary Summary ════════════════════════════════════════════════════════════
.salary-summary {
  margin-top: $space-4;
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  overflow: hidden;

  &__title {
    padding: $space-3 $space-4;
    background: $stb-surface-2;
    font-size: $font-size-sm;
    font-weight: 700;
    color: $stb-text-secondary;
    border-bottom: 1px solid $stb-border;
  }

  &__rows {
    padding: $space-2 0;
  }
}

.salary-row {
  @include flex(row, center, space-between);
  padding: $space-2 $space-4;
  font-size: $font-size-sm;
  color: $stb-text-secondary;

  &--total {
    border-top: 1px solid $stb-border;
    margin-top: $space-2;
    padding-top: $space-3;
    font-weight: 700;
    color: $stb-text-primary;
    font-size: $font-size-base;

    strong {
      color: $stb-accent;
    }
  }
}

// ══ Skip Note ════════════════════════════════════════════════════════════════
.skip-note {
  @include flex(column, center, center, $space-3);
  padding: $space-8 $space-4;
  text-align: center;
  color: $stb-text-muted;

  &__icon {
    opacity: 0.3;
  }

  p {
    font-size: $font-size-sm;
    max-width: 300px;
    line-height: 1.6;

    strong {
      color: $stb-text-secondary;
    }
  }
}

// ══ Info Note ════════════════════════════════════════════════════════════════
.info-note {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3;
  background: rgba($stb-accent, 0.06);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $stb-text-secondary;

  svg {
    flex-shrink: 0;
    color: $stb-accent;
    margin-top: 1px;
  }
}

// ══ Review Cards ══════════════════════════════════════════════════════════════
.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;

  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}

.review-card {
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  overflow: hidden;

  &__header {
    @include flex(row, center, flex-start, $space-2);
    padding: $space-3 $space-4;
    background: $stb-surface-2;
    border-bottom: 1px solid $stb-border;
    font-size: $font-size-sm;
    font-weight: 700;
    color: $stb-text-secondary;

    svg {
      color: $stb-accent;
    }

    span {
      flex: 1;
    }
  }
}

.review-edit-btn {
  @include flex(row, center, center, $space-1);
  padding: 2px $space-2;
  border-radius: $radius-sm;
  border: 1px solid $stb-border;
  background: transparent;
  color: $stb-text-muted;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $stb-accent;
    color: $stb-accent;
  }
}

.review-rows {
  padding: $space-3 0;
}

.review-row {
  @include flex(row, center, space-between);
  padding: $space-2 $space-4;
  font-size: $font-size-sm;

  span {
    color: $stb-text-muted;
  }

  strong {
    color: $stb-text-primary;
    font-weight: 600;
  }

  &--total strong {
    color: $stb-accent;
  }
}

.review-skip {
  padding: $space-4;
  text-align: center;
  font-size: $font-size-sm;
  color: $stb-text-muted;
}

// ══ Footer ═══════════════════════════════════════════════════════════════════
.ob-footer {
  @include flex(row, center, space-between);
  padding: $space-4 $space-5;
  border-top: 1px solid $stb-border;
  background: $stb-surface-2;
}

.ob-footer__steps {
  @include flex(row, center, center, $space-2);
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $stb-border;
  cursor: pointer;
  transition: all $transition-fast;

  &--active {
    background: $stb-accent;
    width: 20px;
    border-radius: 4px;
  }

  &--done {
    background: $stb-success;
  }
}

.btn--success {
  @include flex(row, center, center, $space-2);
  background: $stb-success;
  color: #fff;
  border: none;
  padding: $space-2 $space-5;
  border-radius: $radius-md;
  font-weight: 700;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.mt-3 {
  margin-top: $space-3;
}
.mt-4 {
  margin-top: $space-4;
}

// ══ User Form Wrapper ════════════════════════════════════════════════════════
.user-form-wrapper {
  padding-top: $space-4;
  border-top: 1px solid $stb-border;
  margin-top: $space-4;
}

// ══ Animations ═══════════════════════════════════════════════════════════════
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;

  .ob-panel {
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .ob-panel {
    transform: scale(0.95) translateY(16px);
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// ══ Textarea ═════════════════════════════════════════════════════════════════
.form-textarea {
  width: 100%;
  background: $stb-surface-3;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  padding: $space-3;
  color: $stb-text-primary;
  font-size: $font-size-sm;
  resize: vertical;
  font-family: inherit;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $stb-accent;
  }
}
</style>
