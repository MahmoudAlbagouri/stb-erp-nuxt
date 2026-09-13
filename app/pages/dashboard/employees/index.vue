<!-- pages/employees/index.vue -->
<template>
  <div class="page-container">
    <!-- ══ Page Header ══════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="page-header__title">
        <h1>الموظفون</h1>
        <p>إدارة بيانات موظفي الشركة والهويات</p>
      </div>
      <div class="page-header__actions">
        <button
          class="btn btn--outline"
          @click="handleExport('excel')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'excel'" class="spinner spinner--sm" />
          <FileSpreadsheet v-else :size="18" />
          <span>Excel</span>
        </button>
        <button
          class="btn btn--outline"
          @click="handleExport('pdf')"
          :disabled="!!exporting"
        >
          <span v-if="exporting === 'pdf'" class="spinner spinner--sm" />
          <FileText v-else :size="18" />
          <span>PDF</span>
        </button>
        <button class="btn btn--primary" @click="showOnboarding = true">
          <UserPlus :size="18" />
          <span>إضافة موظف</span>
        </button>
      </div>
    </div>

    <!-- ══ Stats Bar ═══════════════════════════════════════════════════════ -->
    <div class="stats-bar">
      <div class="stat-pill">
        <Users :size="14" /><span
          >الإجمالي: <strong>{{ store.filteredEmployees.length }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--active">
        <span class="dot dot--active"></span
        ><span
          >نشط: <strong>{{ countByStatus("active") }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--inactive">
        <span class="dot dot--inactive"></span
        ><span
          >غير نشط: <strong>{{ countByStatus("inactive") }}</strong></span
        >
      </div>
      <div class="stat-pill stat-pill--terminated">
        <span class="dot dot--terminated"></span
        ><span
          >منتهي: <strong>{{ countByStatus("terminated") }}</strong></span
        >
      </div>
    </div>

    <!-- ══ Main Filters & Advanced Search ═══════════════════════════════════ -->
    <div class="card filters-card">
      <!-- الصف الأول: البحث والفلترة السريعة -->
      <div class="filters-row">
        <div class="search-bar">
          <Search class="search-bar__icon" :size="18" />
          <input
            v-model="search"
            type="text"
            placeholder="بحث بالاسم، الرقم الوظيفي أو الهوية..."
          />
          <button v-if="search" class="search-clear" @click="search = ''">
            <X :size="14" />
          </button>
        </div>
        <select v-model="statusFilter" class="form-select status-select">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="terminated">منتهي الخدمة</option>
        </select>
        <select v-model="nationalityFilter" class="form-select status-select">
          <option value="">كل الجنسيات</option>
          <option value="saudi">سعودي</option>
          <option value="non_saudi">غير سعودي</option>
          <option value="outside_sponsorship">خارج الكفالة</option>
        </select>
      </div>

      <!-- زر فتح/غلق الفلترة المتقدمة -->
      <div class="advanced-toggle-wrapper">
        <button
          type="button"
          class="advanced-filters-toggle"
          :class="{ 'is-active': showAdvancedFilters }"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <SlidersHorizontal :size="16" />
          <span>تخصيص الفلترة المتقدمة</span>
          <ChevronDown
            :size="16"
            class="chevron-icon"
            :class="{ 'rotate-180': showAdvancedFilters }"
          />
        </button>
      </div>

      <!-- محتوى الفلترة المتقدمة -->
      <Transition name="slide-down">
        <div v-if="showAdvancedFilters" class="advanced-filters-body">
          <div class="advanced-filters-grid">
            <div class="form-group">
              <label><Briefcase :size="14" /> القسم</label>
              <select v-model="advFilters.departmentId" class="form-select">
                <option value="">كل الأقسام</option>
                <option
                  v-for="dept in departmentsStore.departments"
                  :key="dept.id"
                  :value="dept.id"
                >
                  {{ dept.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label><Clock :size="14" /> أوقات الدوام</label>
              <select v-model="advFilters.shiftId" class="form-select">
                <option value="">كل الأوقات</option>
                <option
                  v-for="shift in shiftsStore.shifts"
                  :key="shift.id"
                  :value="shift.id"
                >
                  {{ shift.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label><UserCheck :size="14" /> حساب المستخدم</label>
              <select v-model="advFilters.hasUser" class="form-select">
                <option value="">الكل</option>
                <option value="true">لديه حساب</option>
                <option value="false">بدون حساب</option>
              </select>
            </div>

            <div class="form-group">
              <label><FileSignature :size="14" /> عقد العمل</label>
              <select v-model="advFilters.hasContract" class="form-select">
                <option value="">الكل</option>
                <option value="true">لديه عقد</option>
                <option value="false">بدون عقد</option>
              </select>
            </div>

            <div class="form-group">
              <label><AlertCircle :size="14" /> الإقامة</label>
              <select
                v-model="advFilters.iqamaExpiringSoon"
                class="form-select"
              >
                <option value="">الكل</option>
                <option value="true">قاربت على الانتهاء (60 يوم)</option>
              </select>
            </div>
          </div>

          <!-- شريط الإجراءات السفلي للفلترة -->
          <div class="advanced-filters-footer">
            <button
              class="btn btn--ghost btn--sm reset-btn"
              @click="resetAdvancedFilters"
            >
              <RotateCcw :size="14" /> إعادة تعيين الفلاتر
            </button>

            <div class="export-actions-group">
              <span class="export-label">تصدير النتائج الحالية:</span>
              <button
                class="btn btn--success btn--sm"
                :disabled="!!exportingFiltered"
                @click="handleExportFiltered('excel')"
              >
                <span
                  v-if="exportingFiltered === 'excel'"
                  class="spinner spinner--sm"
                />
                <FileSpreadsheet v-else :size="14" />
                Excel
              </button>
              <button
                class="btn btn--danger btn--sm"
                :disabled="!!exportingFiltered"
                @click="handleExportFiltered('pdf')"
              >
                <span
                  v-if="exportingFiltered === 'pdf'"
                  class="spinner spinner--sm"
                />
                <FileText v-else :size="14" />
                PDF
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ══ Loading ══════════════════════════════════════════════════════════ -->
    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 6" :key="i" class="emp-card emp-card--skeleton">
        <div class="skeleton skeleton--avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line-sm"></div>
        </div>
      </div>
    </div>

    <!-- ══ Empty State ══════════════════════════════════════════════════════ -->
    <div v-else-if="!filtered.length" class="empty-wrapper">
      <div class="empty-state">
        <div class="empty-state__illustration"><Users :size="48" /></div>
        <div class="empty-state__title">
          {{
            search || statusFilter || advFilters.departmentId
              ? "لا توجد نتائج تطابق البحث"
              : "لا يوجد موظفون بعد"
          }}
        </div>
        <div class="empty-state__text">
          {{
            search || statusFilter || advFilters.departmentId
              ? "جرب تغيير معايير البحث أو الفلتر"
              : "ابدأ بإضافة أول موظف في شركتك"
          }}
        </div>
        <button
          v-if="!search && !statusFilter && !advFilters.departmentId"
          class="btn btn--primary mt-4"
          @click="showOnboarding = true"
        >
          <UserPlus :size="16" /> إضافة موظف جديد
        </button>
      </div>
    </div>

    <!-- ══ Employee Grid ═════════════════════════════════════════════════════ -->
    <div v-else class="emp-grid">
      <div
        v-for="emp in filtered"
        :key="emp.id"
        class="emp-card"
        @click="openDetail(emp)"
      >
        <div class="emp-card__header">
          <div class="emp-card__avatar" :data-status="emp.status">
            {{ emp.fullName[0] }}
          </div>
          <div class="emp-card__info">
            <h3>{{ emp.fullName }}</h3>
            <span class="emp-card__code">{{ emp.employeeCode }}</span>
          </div>
          <span :class="`badge badge--${emp.status}`">{{
            empStatusLabel(emp.status)
          }}</span>
        </div>
        <div class="emp-card__body">
          <div
            v-if="emp.jobTitle || emp.department"
            class="emp-detail emp-detail--primary"
          >
            <Briefcase :size="13" class="detail-icon" />
            <span>{{
              [emp.jobTitle, emp.department?.name].filter(Boolean).join(" — ")
            }}</span>
          </div>
          <div class="emp-detail">
            <Globe :size="13" class="detail-icon" /><span>{{
              getNationalityLabel(emp.nationalityType)
            }}</span>
          </div>
          <div v-if="emp.iqamaExpiryDate" class="emp-detail">
            <CalendarDays :size="13" class="detail-icon" />
            <span
              :class="
                isIqamaExpiringSoon(emp.iqamaExpiryDate) ? 'text-warning' : ''
              "
            >
              إقامة حتى {{ formatDate(emp.iqamaExpiryDate) }}
              <span v-if="isIqamaExpiringSoon(emp.iqamaExpiryDate)">️</span>
            </span>
          </div>
          <div v-if="emp.nationalId" class="emp-detail">
            <IdCard :size="13" class="detail-icon" /><span dir="ltr">{{
              emp.nationalId
            }}</span>
          </div>
          <div v-if="emp.phone" class="emp-detail">
            <Phone :size="13" class="detail-icon" /><span dir="ltr">{{
              emp.phone
            }}</span>
          </div>

          <!-- ✅ قسم الشارات والأزرار (الهوية + المؤهلات) -->
          <div class="emp-card__badges" @click.stop>
            <span v-if="emp.user" class="mini-badge mini-badge--user"
              ><ShieldCheck :size="11" /> مستخدم</span
            >
            <span v-if="emp.contract" class="mini-badge mini-badge--contract"
              ><FileText :size="11" /> عقد</span
            >

            <!-- زر الهوية -->
            <button
              v-if="emp.nationalIdCardPath"
              class="mini-badge mini-badge--doc view-id-btn"
              @click="openFileViewer(emp.nationalIdCardPath, 'الهوية الشخصية')"
              title="عرض الهوية"
            >
              <Eye :size="11" /> هوية
            </button>

            <!-- ✅ أزرار المؤهلات (تظهر فقط إذا كان هناك مرفق) -->
            <template v-if="emp.educations && emp.educations.length > 0">
              <template v-for="(edu, idx) in emp.educations" :key="idx">
                <button
                  v-if="edu.attachmentPath"
                  class="mini-badge mini-badge--edu view-edu-btn"
                  @click="
                    openFileViewer(
                      edu.attachmentPath,
                      `مؤهل: ${edu.degree || 'شهادة'}`,
                    )
                  "
                  :title="edu.degree"
                >
                  <GraduationCap :size="11" />
                  <span class="truncate-text">{{ edu.degree || "مؤهل" }}</span>
                </button>
              </template>
            </template>
          </div>
        </div>

        <!-- ✅ فوتر الكارت مع زر التصدير المنفصل -->
        <div class="emp-card__footer" @click.stop>
          <div class="export-dropdown" ref="exportDropdownRef">
            <button
              class="btn btn--ghost btn--sm export-btn"
              @click="toggleExportMenu(emp.id)"
            >
              <Download :size="14" /> تصدير
            </button>
            <Transition name="fade">
              <div v-if="activeExportMenu === emp.id" class="dropdown-menu">
                <button @click="downloadProfile(emp.id, 'pdf')">
                  <FileText :size="14" /> ملف PDF
                </button>
                <button @click="downloadProfile(emp.id, 'excel')">
                  <FileSpreadsheet :size="14" /> ملف Excel
                </button>
              </div>
            </Transition>
          </div>

          <div class="footer-actions">
            <button class="btn btn--ghost btn--sm" @click="openEdit(emp)">
              <Pencil :size="14" /> تعديل
            </button>
            <button class="btn btn--danger btn--sm" @click="confirmDelete(emp)">
              <Trash2 :size="14" /> حذف
            </button>
          </div>
        </div>
      </div>
    </div>

    <OnboardingModal v-model="showOnboarding" @created="onEmployeeCreated" />

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditModal"
          class="modal-overlay"
          @click.self="showEditModal = false"
        >
          <div class="modal modal-lg">
            <div class="modal__header">
              <h3>تعديل بيانات الموظف</h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="showEditModal = false"
              >
                <X :size="20" />
              </button>
            </div>
            <form @submit.prevent="handleUpdate" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>الاسم الكامل *</label
                  ><input
                    v-model="editForm.fullName"
                    type="text"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>الجنسية *</label>
                  <select
                    v-model="editForm.nationalityType"
                    class="form-select"
                    required
                  >
                    <option value="saudi">🇸🇦 سعودي</option>
                    <option value="non_saudi">غير سعودي</option>
                    <option value="outside_sponsorship">📄 خارج الكفالة</option>
                  </select>
                </div>
                <div
                  v-if="editForm.nationalityType === 'non_saudi'"
                  class="form-group"
                >
                  <label>تاريخ انتهاء *</label
                  ><input
                    v-model="editForm.iqamaExpiryDate"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>رقم الهوية</label
                  ><input
                    v-model="editForm.nationalId"
                    type="text"
                    class="form-input"
                    placeholder="1xxxxxxxxx"
                    maxlength="10"
                    @input="
                      editForm.nationalId = editForm.nationalId.replace(
                        /[^0-9]/g,
                        '',
                      )
                    "
                  />
                </div>
                <div class="form-group">
                  <label>المسمى الوظيفي</label
                  ><input
                    v-model="editForm.jobTitle"
                    type="text"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>القسم</label>
                  <select v-model="editForm.departmentId" class="form-select">
                    <option value="">بدون قسم</option>
                    <option
                      v-for="dept in departmentsStore.departments"
                      :key="dept.id"
                      :value="dept.id"
                    >
                      {{ dept.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>رقم الهاتف</label
                  ><input
                    v-model="editForm.phone"
                    type="tel"
                    class="form-input"
                    dir="ltr"
                    maxlength="10"
                    @input="
                      editForm.phone = editForm.phone.replace(/[^0-9]/g, '')
                    "
                  />
                </div>
                <div class="form-group">
                  <label>الحالة الوظيفية</label>
                  <select v-model="editForm.status" class="form-select">
                    <option value="active">✅ نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="terminated">❌ منتهي الخدمة</option>
                  </select>
                </div>
                <div class="form-group full-width linked-user-section">
                  <label><LinkIcon :size="14" /> ربط بحساب مستخدم موجود</label>
                  <div class="linked-user-controls">
                    <select
                      v-model="editForm.userId"
                      class="form-select"
                      :class="{ 'has-value': editForm.userId }"
                    >
                      <option value="">-- اختر مستخدماً للربط --</option>
                      <option
                        v-for="u in availableUsers"
                        :key="u.id"
                        :value="u.id"
                      >
                        {{ u.username }} ({{ u.email }})
                      </option>
                    </select>
                    <button
                      v-if="editForm.userId"
                      type="button"
                      class="btn btn--danger btn--sm unlink-btn"
                      @click="editForm.userId = null"
                      title="إلغاء الربط"
                    >
                      <Unlink :size="14" />
                    </button>
                  </div>
                  <small class="form-hint"
                    >يظهر هنا فقط المستخدمون الذين لا يرتبطون بموظف آخر
                    حالياً.</small
                  >
                </div>
                <div class="form-group full-width">
                  <label>صورة/ملف الهوية</label
                  ><StbUploader
                    v-model="editForm.nationalIdCardPath"
                    endpoint="/media/upload/employee"
                    field-name="files"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    :max-size="5 * 1024 * 1024"
                    idle-title="ارفع صورة الهوية أو ملف PDF"
                    hint="JPG / PNG / PDF — بحد أقصى 5 MB"
                    @error="toast.error"
                  />
                </div>
                <div class="form-group full-width education-toggle-section">
                  <div class="toggle-card">
                    <div class="toggle-card__info">
                      <GraduationCap :size="20" class="toggle-card__icon" />
                      <div>
                        <strong>المؤهلات العلمية</strong>
                        <p>إضافة وتعديل درجات الشهادات</p>
                      </div>
                    </div>
                    <label class="toggle-switch"
                      ><input
                        v-model="showEducationForm"
                        type="checkbox" /><span
                        class="toggle-switch__track"
                      ></span
                    ></label>
                  </div>
                  <Transition name="slide-down">
                    <div v-if="showEducationForm" class="mt-4">
                      <div class="add-edu-header">
                        <button
                          type="button"
                          class="btn btn--sm btn--outline btn--dashed"
                          @click="addEducationRow"
                        >
                          <Plus :size="14" /> إضافة مؤهل جديد
                        </button>
                      </div>
                      <div
                        v-for="(edu, index) in editForm.educations"
                        :key="index"
                        class="education-item-card"
                      >
                        <div class="edu-item-header">
                          <span class="edu-index">#{{ index + 1 }}</span
                          ><button
                            type="button"
                            class="btn btn--icon btn--danger btn--sm"
                            @click="removeEducationRow(index)"
                            title="حذف"
                          >
                            <Trash2 :size="16" />
                          </button>
                        </div>
                        <div class="edu-item-fields">
                          <div class="form-group">
                            <label class="form-label">نوع الشهادة</label
                            ><input
                              v-model="edu.degree"
                              type="text"
                              class="form-input"
                              placeholder="مثال: بكالوريوس هندسة"
                            />
                          </div>
                          <div class="form-group">
                            <label class="form-label">رقم الشهادة</label
                            ><input
                              v-model="edu.certificateNumber"
                              type="text"
                              class="form-input"
                              placeholder="رقم الوثيقة"
                            />
                          </div>
                          <div class="form-group">
                            <label class="form-label"
                              >جهة الإصدار / المصدر</label
                            ><input
                              v-model="edu.issuingAuthority"
                              type="text"
                              class="form-input"
                              placeholder="مثال: جامعة الملك سعود"
                            />
                          </div>
                          <div class="form-group">
                            <label class="form-label"
                              >تاريخ الانتهاء (اختياري)</label
                            ><input
                              v-model="edu.expiryDate"
                              type="date"
                              class="form-input"
                            />
                          </div>
                          <div class="form-group form-group--full">
                            <label class="form-label">مرفق الشهادة</label>
                            <div class="uploader-with-viewer">
                              <StbUploader
                                :model-value="edu.attachmentPath"
                                @update:model-value="
                                  (val) => (edu.attachmentPath = val || '')
                                "
                                endpoint="/media/upload/employee"
                                field-name="files"
                                accept=".pdf,.doc,.docx,image/*"
                                :max-size="5 * 1024 * 1024"
                                idle-title="ارفع صورة أو ملف PDF"
                                hint="PDF / Images — بحد أقصى 5 MB"
                                @error="toast.error"
                              />
                              <button
                                v-if="edu.attachmentPath"
                                type="button"
                                class="btn btn--outline btn--sm view-file-btn"
                                @click="
                                  openFileViewer(
                                    edu.attachmentPath,
                                    `مرفق: ${edu.degree || 'شهادة'}`,
                                  )
                                "
                              >
                                <Eye :size="14" /> عرض المرفق
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="editForm.educations.length === 0"
                        class="empty-mini"
                      >
                        <span
                          >لا توجد مؤهلات مضافة. اضغط "إضافة مؤهل جديد"
                          للبدء.</span
                        >
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="showEditModal = false"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="updating"
                >
                  <span v-if="updating" class="spinner" /><span v-else
                    >حفظ التغييرات</span
                  >
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ✅ Universal File Viewer Modal (للصور و PDF) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showFileViewer"
          class="modal-overlay"
          @click.self="closeFileViewer"
        >
          <div class="modal modal-lg file-viewer-modal">
            <div class="modal__header">
              <h3>
                <FileText :size="20" class="modal-icon" />
                {{ viewerTitle }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                @click="closeFileViewer"
                aria-label="إغلاق"
              >
                <X :size="20" />
              </button>
            </div>
            <div class="modal__body file-preview-container">
              <div v-if="currentFileUrl" class="file-content-wrapper">
                <!-- حالة الصورة -->
                <img
                  v-if="isImage(currentFileUrl)"
                  :src="currentFileUrl"
                  alt="معاينة الملف"
                  class="preview-image"
                />

                <!-- حالة PDF -->
                <div v-else-if="isPdf(currentFileUrl)" class="pdf-preview">
                  <div class="pdf-icon-large">
                    <FileText :size="64" />
                  </div>
                  <p class="pdf-hint">ملف PDF - يرجى تحميله للمشاهدة الكاملة</p>
                </div>

                <!-- حالة أخرى -->
                <div v-else class="file-preview-fallback">
                  <File :size="48" class="fallback-icon" />
                  <p>نوع الملف غير مدعوم للمعاينة المباشرة</p>
                </div>

                <!-- أزرار التحكم -->
                <div class="file-actions-bar">
                  <a
                    :href="currentFileUrl"
                    target="_blank"
                    class="btn btn--primary"
                  >
                    <ExternalLink :size="16" /> فتح في تبويب جديد
                  </a>

                  <!-- ✅ زر التحميل القسري -->
                  <button
                    @click="forceDownload(currentFileUrl)"
                    class="btn btn--outline"
                  >
                    <Download :size="16" /> تحميل الملف
                  </button>
                </div>
              </div>
              <div v-else class="empty-state-mini">
                <p>لا يوجد ملف للعرض</p>
              </div>
            </div>
            <div class="modal__footer">
              <button class="btn btn--ghost" @click="closeFileViewer">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف الموظف"
      :message="`هل تريد حذف الموظف '${deleteTarget?.fullName}'؟ لا يمكن التراجع عن هذا الإجراء.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useEmployeesStore } from "@/stores/employees";
import { useUsersStore } from "@/stores/users";
import { useDepartmentsStore } from "@/stores/departments";
import { useShiftsStore } from "@/stores/shifts";
import { useToast } from "@/composables/useToast";
import type { Employee, User, Education } from "@/types";
import OnboardingModal from "@/components/employees/OnboardingModal.vue";
import {
  FileSpreadsheet,
  FileText,
  File,
  UserPlus,
  Search,
  Users,
  Globe,
  CalendarDays,
  IdCard,
  Briefcase,
  Phone,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Link as LinkIcon,
  Unlink,
  Eye,
  ExternalLink,
  Download,
  GraduationCap,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  // أيقونات جديدة للفلترة
  Clock,
  UserCheck,
  FileSignature,
  AlertCircle,
  RotateCcw,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const store = useEmployeesStore();
const usersStore = useUsersStore();
const departmentsStore = useDepartmentsStore();
const shiftsStore = useShiftsStore();
const toast = useToast();
const showOnboarding = ref(false);
const onEmployeeCreated = (result: any) =>
  toast.success(`✅ تم إضافة الموظف "${result.employee.fullName}" بنجاح`);

const exporting = ref<"excel" | "pdf" | null>(null);
const handleExport = async (type: "excel" | "pdf") => {
  exporting.value = type;
  try {
    await store.exportData(type);
    toast.success(`تم تصدير تقرير ${type === "excel" ? "Excel" : "PDF"} بنجاح`);
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  } finally {
    exporting.value = null;
  }
};

// ✅ منطق التصدير الفردي
const activeExportMenu = ref<string | null>(null);
const toggleExportMenu = (id: string) => {
  activeExportMenu.value = activeExportMenu.value === id ? null : id;
};

const downloadProfile = async (id: string, type: "excel" | "pdf") => {
  try {
    await store.exportSingle(id, type);
    toast.success(`تم تصدير ملف الموظف بصيغة ${type.toUpperCase()} بنجاح`);
    activeExportMenu.value = null;
  } catch (e: any) {
    toast.error(e.message || "فشل في التصدير");
  }
};

// إغلاق القائمة عند النقر خارجها
onMounted(() => {
  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest(".export-dropdown")) {
      activeExportMenu.value = null;
    }
  });
});

const search = ref("");
const statusFilter = ref("");
const nationalityFilter = ref("");

// ✅ الفلترة المتقدمة
const showAdvancedFilters = ref(false);
const advFilters = reactive({
  departmentId: "",
  shiftId: "",
  hasUser: "" as "" | "true" | "false",
  hasContract: "" as "" | "true" | "false",
  iqamaExpiringSoon: "" as "" | "true",
});

// ✅ دالة لتطبيق الفلاتر عبر الـ Backend
const applyFilters = async () => {
  const filters = {
    status: statusFilter.value || undefined,
    nationalityType: nationalityFilter.value || undefined,
    search: search.value || undefined,
    departmentId: advFilters.departmentId || undefined,
    shiftId: advFilters.shiftId || undefined,
    hasUser: advFilters.hasUser || undefined,
    hasContract: advFilters.hasContract || undefined,
    iqamaExpiringSoon: advFilters.iqamaExpiringSoon || undefined,
  };

  await store.fetchFilteredFromBackend(filters);
};

// ✅ مراقبة التغييرات في الفلاتر واستدعاء الـ Backend تلقائياً
watch(
  [search, statusFilter, nationalityFilter, advFilters],
  () => {
    applyFilters();
  },
  { deep: true },
);

// ✅ الاعتماد على القائمة المجلوبة من السيرفر
const filtered = computed(() => store.filteredEmployees);

const countByStatus = (s: string) =>
  store.filteredEmployees.filter((e: Employee) => e.status === s).length;

const resetAdvancedFilters = () => {
  advFilters.departmentId = "";
  advFilters.shiftId = "";
  advFilters.hasUser = "";
  advFilters.hasContract = "";
  advFilters.iqamaExpiringSoon = "";
  // الـ watch سيقوم باستدعاء applyFilters تلقائياً
};

const isIqamaWithin60Days = (date?: string) => {
  if (!date) return false;
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
};

// ✅ تصدير نتائج الفلترة عبر السيرفر
const exportingFiltered = ref<"excel" | "pdf" | null>(null);
const handleExportFiltered = async (type: "excel" | "pdf") => {
  exportingFiltered.value = type;
  try {
    await store.exportFiltered(type, {
      status: statusFilter.value || undefined,
      nationalityType: nationalityFilter.value || undefined,
      departmentId: advFilters.departmentId || undefined,
      shiftId: advFilters.shiftId || undefined,
      hasUser: advFilters.hasUser || undefined,
      hasContract: advFilters.hasContract || undefined,
      iqamaExpiringSoon: advFilters.iqamaExpiringSoon || undefined,
      search: search.value || undefined,
    });
    toast.success("تم تصدير نتائج الفلترة بنجاح");
  } catch (e: any) {
    toast.error(e.message || "فشل في تصدير النتائج");
  } finally {
    exportingFiltered.value = null;
  }
};

// ─── Universal File Viewer Logic ──────────────────────────────────────────
const showFileViewer = ref(false);
const currentFileUrl = ref<string>("");
const viewerTitle = ref<string>("");

const openFileViewer = (url: string, title: string = "عرض الملف") => {
  currentFileUrl.value = url;
  viewerTitle.value = title;
  showFileViewer.value = true;
};

const closeFileViewer = () => {
  showFileViewer.value = false;
  currentFileUrl.value = "";
  viewerTitle.value = "";
};

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const isPdf = (url: string) => /\.pdf$/i.test(url);

const forceDownload = async (url: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    const fileName = url.split("/").pop() || "downloaded_file";
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("فشل في تحميل الملف:", error);
    toast.error("حدث خطأ أثناء محاولة تحميل الملف");
  }
};

const showEditModal = ref(false);
const updating = ref(false);
const editingEmployee = ref<Employee | null>(null);
const showEducationForm = ref(false);

interface EditFormType {
  fullName: string;
  nationalityType: "saudi" | "non_saudi" | "outside_sponsorship";
  iqamaExpiryDate: string;
  nationalId: string;
  nationalIdCardPath: string;
  phone: string;
  jobTitle: string;
  departmentId: string;
  status: "active" | "inactive" | "terminated";
  userId: string | null;
  educations: Education[];
}
const editForm = reactive<EditFormType>({
  fullName: "",
  nationalityType: "saudi",
  iqamaExpiryDate: "",
  nationalId: "",
  nationalIdCardPath: "",
  phone: "",
  jobTitle: "",
  departmentId: "",
  status: "active",
  userId: null,
  educations: [],
});

const availableUsers = computed(() => {
  const assignedUserIds = new Set(
    store.filteredEmployees.filter((e) => e.user?.id).map((e) => e.user!.id),
  );
  if (editingEmployee.value?.user?.id)
    assignedUserIds.delete(editingEmployee.value.user.id);
  return usersStore.users.filter((u: User) => !assignedUserIds.has(u.id));
});

const addEducationRow = () =>
  editForm.educations.push({
    degree: "",
    certificateNumber: "",
    issuingAuthority: "",
    expiryDate: "",
    attachmentPath: "",
  });
const removeEducationRow = (index: number) =>
  editForm.educations.splice(index, 1);

const openEdit = async (emp: Employee) => {
  editingEmployee.value = emp;
  if (usersStore.users.length === 0) await usersStore.fetchAll();
  Object.assign(editForm, {
    fullName: emp.fullName,
    nationalityType: emp.nationalityType,
    iqamaExpiryDate: emp.iqamaExpiryDate
      ? new Date(emp.iqamaExpiryDate).toISOString().split("T")[0]
      : "",
    nationalId: emp.nationalId ?? "",
    nationalIdCardPath: emp.nationalIdCardPath ?? "",
    phone: emp.phone ?? "",
    jobTitle: emp.jobTitle ?? "",
    departmentId: emp.department?.id ?? "",
    status: emp.status,
    userId: emp.user?.id ?? null,
    educations: emp.educations
      ? JSON.parse(JSON.stringify(emp.educations))
      : [],
  });
  showEducationForm.value = editForm.educations.length > 0;
  showEditModal.value = true;
};

const handleUpdate = async () => {
  if (!editingEmployee.value) return;
  updating.value = true;
  try {
    const cleanEducations = editForm.educations.map((edu) => {
      const cleanEdu: any = {
        degree: edu.degree,
        certificateNumber: edu.certificateNumber || undefined,
        issuingAuthority: edu.issuingAuthority || undefined,
        expiryDate: edu.expiryDate || undefined,
        attachmentPath: edu.attachmentPath || undefined,
      };
      if (edu.id) cleanEdu.id = edu.id;
      return cleanEdu;
    });
    const payload: any = {
      fullName: editForm.fullName,
      nationalityType: editForm.nationalityType,
      nationalId: editForm.nationalId || undefined,
      nationalIdCardPath: editForm.nationalIdCardPath || undefined,
      phone: editForm.phone || undefined,
      jobTitle: editForm.jobTitle || undefined,
      departmentId: editForm.departmentId || undefined,
      status: editForm.status,
      userId: editForm.userId || undefined,
      educations: cleanEducations,
    };
    if (editForm.nationalityType !== "non_saudi")
      payload.iqamaExpiryDate = null;
    await store.update(editingEmployee.value.id, payload);
    toast.success("تم تحديث بيانات الموظف بنجاح");
    showEditModal.value = false;
    // إعادة تطبيق الفلاتر لتحديث القائمة
    await applyFilters();
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "حدث خطأ أثناء التحديث");
  } finally {
    updating.value = false;
  }
};

const openDetail = (emp: Employee) =>
  navigateTo(`/dashboard/employees/${emp.id}`);

const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<Employee | null>(null);
const confirmDelete = (emp: Employee) => {
  deleteTarget.value = emp;
  showConfirm.value = true;
};
const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    toast.success("تم حذف الموظف");
    showConfirm.value = false;
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    deleting.value = false;
  }
};

const empStatusLabel = (s: string) =>
  ({ active: "نشط", inactive: "غير نشط", terminated: "منتهي" })[s] ?? s;
const getNationalityLabel = (type?: string) =>
  ({
    saudi: "🇸 سعودي",
    non_saudi: " غير سعودي",
    outside_sponsorship: "📄 خارج الكفالة",
  })[type ?? ""] ?? "—";
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");
const isIqamaExpiringSoon = (date: string) => {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
};

onMounted(() => {
  // جلب الكل مبدئياً لعرض الصفحة غير فارغة
  store.fetchAll();
  usersStore.fetchAll();
  departmentsStore.fetchAll();
  shiftsStore.fetchAll();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
  @include respond-to("md") {
    width: 100%;
    justify-content: space-between;
  }
}

.stats-bar {
  display: flex;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-4;
}

.stat-pill {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  strong {
    color: $stb-text-primary;
    font-weight: 700;
  }
  &--active {
    border-color: rgba($stb-success, 0.3);
  }
  &--inactive {
    border-color: rgba($stb-warning, 0.3);
  }
  &--terminated {
    border-color: rgba($stb-danger, 0.3);
  }
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  &--active {
    background: $stb-success;
  }
  &--inactive {
    background: $stb-warning;
  }
  &--terminated {
    background: $stb-danger;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTERS CARD STYLES (IMPROVED)
   ═══════════════════════════════════════════════════════════════════════════ */
.filters-card {
  padding: $space-5;
  margin-bottom: $space-5;
  border: 1px solid $stb-border;
  background: $stb-surface;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.filters-row {
  @include flex(row, center, flex-start, $space-3);
  width: 100%;
  flex-wrap: wrap;
  margin-bottom: $space-4;

  @include respond-to("md") {
    flex-direction: column;
    align-items: stretch;
  }
}

.search-bar {
  position: relative;
  flex: 1;
  min-width: 240px;

  .search-bar__icon {
    position: absolute;
    right: $space-3;
    top: 50%;
    transform: translateY(-50%);
    color: $stb-text-muted;
    pointer-events: none;
  }

  input {
    width: 100%;
    padding-right: $space-8;
    padding-left: $space-3;
    height: 42px;
    border-radius: $radius-md;
    border: 1px solid $stb-border;
    background: $stb-surface-2;
    transition: all 0.2s;

    &:focus {
      border-color: $stb-accent;
      box-shadow: 0 0 0 3px rgba($stb-accent, 0.1);
      outline: none;
    }
  }
}

.search-clear {
  position: absolute;
  left: $space-2;
  top: 50%;
  transform: translateY(-50%);
  @include flex(row, center, center);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: $stb-text-muted;
  cursor: pointer;
  &:hover {
    background: rgba($stb-danger, 0.1);
    color: $stb-danger;
  }
}

.status-select {
  width: 160px;
  height: 42px;
  border-radius: $radius-md;
  border: 1px solid $stb-border;
  background: $stb-surface-2;
  padding: 0 $space-3;
  cursor: pointer;

  @include respond-to("md") {
    width: 100%;
  }
}

/* Toggle Button for Advanced Filters */
.advanced-toggle-wrapper {
  border-top: 1px dashed $stb-border;
  padding-top: $space-3;
  margin-top: $space-2;
}

.advanced-filters-toggle {
  @include flex(row, center, flex-start, $space-2);
  width: 100%;
  background: transparent;
  border: none;
  color: $stb-accent;
  font-weight: 600;
  font-size: $font-size-sm;
  cursor: pointer;
  padding: $space-2 0;
  transition: color 0.2s;

  &:hover {
    color: rgba($stb-accent, 50%);
  }

  &.is-active {
    color: $stb-text-primary;
  }
}

.chevron-icon {
  margin-right: auto; /* Push to left in RTL */
  transition: transform 0.3s ease;

  &.rotate-180 {
    transform: rotate(180deg);
  }
}

/* Advanced Filters Body */
.advanced-filters-body {
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $stb-border;
  animation: fadeIn 0.3s ease-out;
}

.advanced-filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;
  margin-bottom: $space-5;

  @include respond-to("lg") {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $stb-text-secondary;
    @include flex(row, center, flex-start, $space-1);

    svg {
      color: $stb-text-muted;
    }
  }

  .form-select {
    width: 100%;
    height: 40px;
    border-radius: $radius-md;
    border: 1px solid $stb-border;
    background: $stb-surface-2;
    padding: 0 $space-3;
    font-size: $font-size-sm;
    color: $stb-text-primary;
    transition: all 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: left $space-2 center;
    background-size: 16px;

    &:focus {
      border-color: $stb-accent;
      box-shadow: 0 0 0 3px rgba($stb-accent, 0.1);
      outline: none;
    }
  }
}

/* Footer Actions for Filters */
.advanced-filters-footer {
  @include flex(row, center, space-between);
  padding-top: $space-4;
  border-top: 1px solid $stb-border;
  background: rgba($stb-surface-2, 0.5);
  margin: 0 (-$space-5) (-$space-5); /* Extend to edges */
  padding: $space-4 $space-5;
  border-radius: 0 0 $radius-lg $radius-lg;

  @include respond-to("md") {
    flex-direction: column;
    gap: $space-3;
    align-items: stretch;
  }
}

.reset-btn {
  color: $stb-text-muted;
  &:hover {
    color: $stb-danger;
    background: rgba($stb-danger, 0.05);
  }
}

.export-actions-group {
  @include flex(row, center, flex-end, $space-3);

  @include respond-to("md") {
    justify-content: space-between;
  }
}

.export-label {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  display: none;

  @include respond-to("sm") {
    display: block;
  }
}

.btn--success {
  background: rgba($stb-success, 0.1);
  color: $stb-success;
  border: 1px solid rgba($stb-success, 0.2);
  &:hover:not(:disabled) {
    background: $stb-success;
    color: #fff;
  }
}

.btn--danger {
  background: rgba($stb-danger, 0.1);
  color: $stb-danger;
  border: 1px solid rgba($stb-danger, 0.2);
  &:hover:not(:disabled) {
    background: $stb-danger;
    color: #fff;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING & EMPTY STATES
   ═══════════════════════════════════════════════════════════════════════════ */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}

.skeleton {
  background: linear-gradient(
    90deg,
    $stb-surface-2 25%,
    $stb-surface-3 50%,
    $stb-surface-2 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: $radius-md;
  &--avatar {
    width: 48px;
    height: 48px;
    border-radius: $radius-lg;
    flex-shrink: 0;
  }
  &--line {
    height: 14px;
    width: 70%;
    margin-bottom: $space-2;
  }
  &--line-sm {
    height: 11px;
    width: 40%;
  }
}

.skeleton-lines {
  flex: 1;
}

.emp-card--skeleton {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-5;
  pointer-events: none;
  min-height: 80px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.empty-wrapper {
  @include flex(row, center, center);
  min-height: 320px;
}

.empty-state {
  @include flex(column, center, center, $space-3);
  text-align: center;
  &__illustration {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: $stb-surface-2;
    border: 1px solid $stb-border;
    @include flex(row, center, center);
    color: $stb-text-muted;
    opacity: 0.5;
    margin-bottom: $space-2;
  }
  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: $stb-text-secondary;
  }
  &__text {
    font-size: $font-size-sm;
    color: $stb-text-muted;
    max-width: 280px;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPLOYEE GRID & CARDS
   ═══════════════════════════════════════════════════════════════════════════ */
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-4;
}

.emp-card {
  @include glass-card;
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  transition: all $transition-base;
  cursor: pointer;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-2px);
    border-color: $stb-accent;
    box-shadow: $shadow-md;
  }

  &__header {
    @include flex(row, center, flex-start, $space-3);
  }

  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: $radius-lg;
    background: $gradient-primary;
    @include flex(row, center, center);
    font-size: $font-size-xl;
    font-weight: 900;
    color: #fff;
    flex-shrink: 0;
    box-shadow: $shadow-glow;
    position: relative;
    &::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid $stb-surface;
    }
    &[data-status="active"]::after {
      background: $stb-success;
    }
    &[data-status="inactive"]::after {
      background: $stb-warning;
    }
    &[data-status="terminated"]::after {
      background: $stb-danger;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    h3 {
      font-size: $font-size-base;
      font-weight: 700;
      @include truncate;
      margin: 0 0 2px;
    }
  }

  &__code {
    font-size: $font-size-xs;
    color: $stb-accent;
    font-family: monospace;
    letter-spacing: 0.05em;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    flex: 1;
  }

  &__badges {
    @include flex(row, center, flex-start, $space-2);
    flex-wrap: wrap;
    margin-top: $space-1;
  }

  &__footer {
    @include flex(row, center, space-between, $space-2);
    padding-top: $space-3;
    border-top: 1px solid $stb-border;
    margin-top: auto;

    .footer-actions {
      display: flex;
      gap: $space-2;
    }

    .export-dropdown {
      position: relative;
      display: inline-block;
    }

    .export-btn {
      color: $stb-accent;
      &:hover {
        background: rgba($stb-accent, 0.1);
        color: $stb-accent;
      }
    }

    .dropdown-menu {
      position: absolute;
      bottom: 100%;
      left: 0;
      margin-bottom: $space-2;
      background: $stb-surface;
      border: 1px solid $stb-border;
      border-radius: $radius-md;
      box-shadow: $shadow-lg;
      z-index: 10;
      min-width: 140px;
      overflow: hidden;

      button {
        display: flex;
        align-items: center;
        gap: $space-2;
        width: 100%;
        padding: $space-2 $space-3;
        border: none;
        background: transparent;
        color: $stb-text-primary;
        font-size: $font-size-xs;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          background: rgba($stb-accent, 0.08);
          color: $stb-accent;
        }
        svg {
          color: $stb-text-muted;
        }
      }
    }
  }
}

.emp-detail {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-xs;
  color: $stb-text-secondary;
  .detail-icon {
    flex-shrink: 0;
    color: $stb-text-muted;
  }
  &--primary {
    font-weight: 600;
    color: $stb-text-primary;
    font-size: $font-size-sm;
  }
}

.text-warning {
  color: $stb-warning !important;
  font-weight: 600;
}

.mini-badge {
  @include flex(row, center, center, 4px);
  font-size: 10px;
  padding: 2px 7px;
  border-radius: $radius-sm;
  font-weight: 600;
  cursor: default;

  &.view-id-btn,
  &.view-edu-btn {
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
  }

  &--user {
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
  }
  &--contract {
    background: rgba($stb-success, 0.1);
    color: $stb-success;
  }
  &--edu {
    background: rgba($stb-info, 0.1);
    color: $stb-info;
    &.view-edu-btn {
      background: rgba($stb-info, 0.15);
      border-color: rgba($stb-info, 0.3);
      &:hover {
        background: rgba($stb-info, 0.25);
      }
    }
  }
  &--doc {
    background: rgba($stb-warning, 0.1);
    color: $stb-warning;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: rgba($stb-warning, 0.2);
      transform: translateY(-1px);
    }
  }
}

.truncate-text {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODALS & FORMS
   ══════════════════════════════════════════════════════════════════════════ */
.modal-lg {
  max-width: 680px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  @include respond-to("md") {
    grid-template-columns: 1fr;
  }
}

.full-width {
  grid-column: span 2;
  @include respond-to("md") {
    grid-column: span 1;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-secondary;
    @include flex(row, center, flex-start, $space-2);
    svg {
      flex-shrink: 0;
    }
  }
}

.modal__footer {
  @include flex(row, center, flex-end, $space-3);
  padding-top: $space-4;
  border-top: 1px solid $stb-border;
}

.mt-4 {
  margin-top: $space-4 !important;
}

.linked-user-section {
  background: rgba($stb-accent, 0.03);
  padding: $space-3;
  border-radius: $radius-md;
  border: 1px dashed $stb-border;
  label {
    margin-bottom: $space-2;
    color: $stb-accent;
  }
}

.linked-user-controls {
  display: flex;
  gap: $space-2;
  align-items: center;
  select {
    flex: 1;
  }
  .unlink-btn {
    flex-shrink: 0;
    height: 38px;
    padding: 0 $space-3;
  }
}

.form-hint {
  font-size: 11px;
  color: $stb-text-muted;
  margin-top: $space-1;
}

.education-toggle-section {
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
        right: 2px;
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
}

.add-edu-header {
  margin-bottom: $space-3;
  display: flex;
  justify-content: flex-end;
}

.btn--dashed {
  border-style: dashed;
  border-color: $stb-border;
  color: $stb-text-secondary;
  &:hover {
    border-color: $stb-accent;
    color: $stb-accent;
    background: rgba($stb-accent, 0.05);
  }
}

.education-item-card {
  background: $stb-surface-2;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  padding: $space-4;
  margin-bottom: $space-3;
  position: relative;
  .edu-item-header {
    @include flex(row, center, space-between);
    margin-bottom: $space-3;
    padding-bottom: $space-2;
    border-bottom: 1px solid $stb-border;
    .edu-index {
      font-size: $font-size-sm;
      font-weight: 700;
      color: $stb-accent;
    }
  }
  .edu-item-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $space-3;
    @include respond-to("md") {
      grid-template-columns: 1fr;
    }
  }
}

.empty-mini {
  text-align: center;
  padding: $space-4;
  color: $stb-text-muted;
  font-size: $font-size-sm;
  background: rgba($stb-surface-3, 0.5);
  border-radius: $radius-md;
  border: 1px dashed $stb-border;
}

.uploader-with-viewer {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  .view-file-btn {
    align-self: flex-start;
    font-size: $font-size-xs;
  }
}

.file-viewer-modal {
  max-width: 900px;
}
.file-preview-container {
  padding: $space-4;
  background: $stb-surface-2;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.file-content-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-4;
}
.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
}
.pdf-preview {
  text-align: center;
  padding: $space-8;
  .pdf-icon-large {
    color: $stb-danger;
    margin-bottom: $space-3;
  }
  .pdf-hint {
    color: $stb-text-muted;
    font-size: $font-size-sm;
  }
}
.file-preview-fallback {
  text-align: center;
  color: $stb-text-muted;
  .fallback-icon {
    margin-bottom: $space-2;
  }
}
.file-actions-bar {
  display: flex;
  gap: $space-3;
  margin-top: $space-2;
}
.empty-state-mini {
  color: $stb-text-muted;
  text-align: center;
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 1000px; /* Arbitrary large number */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
